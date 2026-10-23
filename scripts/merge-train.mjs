// Merge train (merge-tools): builds train/<n> from origin/master and ready PR branches, then releases it (or one lone
// PR) through the version step (G183): CHANGELOG from changes/ (scripts/changelog-assemble.mjs), `npm version`, CI on
// that exact commit, and only on a green run the merge, the tag and the dev pointer. It replaces the orchestrator's
// hand-run "Merge procedure" (docs/orchestrator/STATE.md on feature/menu).
// `build` does the slow work once, in order: merge the members, checkout + push train/<n>, open the train PR, bump
// PROTOCOL_VERSION to master+1 when a member touches the wire (src/net and what protocol.ts imports), make the version
// commit (CHANGELOG heading with the PR number), run vitest under the heavy lock, push (CI starts beside the laptop
// run). `release` then only checks, waits for green CI on that head, merges, tags and moves dev. A train built by the
// older script (no version commit) is still released the old way (merge master, version commit, push, CI, merge).
// Conflicts: CHANGELOG.md and changes/* are resolved (both sides kept, incoming block first, never a block dropped);
// any other conflicting file leaves that branch out (build) or stops the run (release / single, exit 3).
// The merges are computed on git objects (`git merge-tree`, `git commit-tree`), so --dry-run moves no ref, worktree
// or remote (it only fetches) and prints what a real run would do.
// Usage:
//   node scripts/merge-train.mjs build <n> <version> "<title>" <branch>... [--keep] [--no-test] [--dry-run]
//   node scripts/merge-train.mjs release <n> <version> "<title>" [--resume] [--head <sha>] [--no-fallback] [--dry-run]
//   node scripts/merge-train.mjs single <branch> <version> "<title>" [--dry-run]
// --head <sha> (release): STOP unless origin/train/<n> is that sha after the fetch (the head CI and the laptop passed
// on). Every merge is `gh pr merge --match-head-commit <the head it verified>`, so a push after the check cannot merge.
// --no-fallback (release): STOP instead of the old-style release when the train has no version commit (auto-train).
// Train lock: build / release / single (not --dry-run) take the auto-train tick lock (AUTO_TRAIN_LOCK, default
// <AUTO_TRAIN_SCRATCH or C:/NightShift/scratch>/auto-train.lock; wx, stale when untouched 30 min, touched every minute),
// so a hand run and a tick never overlap; held -> STOP, exit 1. Under auto-train (AUTO_TRAIN_LOCK_TEXT = the lock's
// text) the caller already holds it. Build / release / single STOP (exit 1) when <version> is not above master's.
// --keep: build on origin/train/<n> (conflicts fixed by hand there) instead of origin/master. A conflicting branch is
// merged by hand on the pre-version head: `git checkout -B train/<n> <version commit>^`, `git merge origin/<b>` with
// the subject "Merge origin/<b> into train/<n>", `git push --force origin train/<n>`, then
// `build <n> <version> "<title>" <all members> --keep` (a --keep over a version commit stops and prints these commands
// with the sha). --no-test: skip vitest.
// --resume: release a train with fix commits after its version commit (package.json at the head must still be
// <version>, no new changes/*.md). HEAVY_LOCK env: the lock file (default C:/NightShift/heavy.lock), taken through
// scripts/heavy-lock.mjs (a lock whose pid is dead on this host is broken). After a merge, `release` closes member PRs
// whose head is in origin/master with "Merged in <version> (train <n>, #<pr>)".
// Exit: 0 built / merged (or dry run done), 1 usage or other error (also: --keep over a version commit, a fix commit
// without --resume, release of an already merged train, release with a version other than the train's version
// commit, --head mismatch, --no-fallback with no version commit, version not above master's, train lock held),
// 2 vitest failed on build or CI failed on release / single
// (nothing merged; a failed build still pushes so a fix can go on train/<n>), 3 conflict stop (build with no member
// merged; release when master moved since build), 4 vitest NOT run on build (heavy lock wait of 5 min (TRAIN_LOCK_WAIT_MIN) timed out; the train is
// pushed, CI's check still runs the unit tests: pending, not a failure).
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { assemble, assembleDir, parseFragment, releaseHeading, summary } from './changelog-assemble.mjs';
import { formatLock, takeLockText, takeTouchLock } from './heavy-lock.mjs';

const DRY = process.argv.includes('--dry-run');
const TRAIN_LOCK_STALE_MIN = 30; // the same staleness as auto-train's tick lock
const TRAILER = 'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>';
const FOOTER = '🤖 Generated with [Claude Code](https://claude.com/claude-code)';

/** Conflicting paths the script resolves itself (`resolvable`) and the ones that stop a merge (`blocking`). */
export function classifyConflicts(files) {
  const ok = (f) => f === 'CHANGELOG.md' || f.startsWith('changes/');
  return { resolvable: files.filter(ok), blocking: files.filter((f) => !ok(f)) };
}

/**
 * Resolves conflict markers keeping both sides: the incoming (theirs) block first, then ours, a blank line between;
 * a diff3 base section is dropped. One exception keeps released sections below unreleased ones: when theirs starts
 * with a released heading ("## 4.x") and ours does not (master merged into a train), ours goes first.
 */
export function resolveKeepBoth(text) {
  const out = [];
  let mode = 0, ours = [], theirs = [], gap = false;
  const trim = (a) => { const t = a.slice(); while (t.length && t[0].trim() === '') t.shift(); while (t.length && t[t.length - 1].trim() === '') t.pop(); return t; };
  const released = (a) => /^## \d/.test(a[0] ?? '');
  for (const l of text.replace(/\r\n/g, '\n').split('\n')) {
    if (mode === 0 && l.startsWith('<<<<<<<')) { mode = 1; ours = []; theirs = []; continue; }
    if (mode === 1 && l.startsWith('|||||||')) { mode = 3; continue; }
    if ((mode === 1 || mode === 3) && l.startsWith('=======')) { mode = 2; continue; }
    if (mode === 2 && l.startsWith('>>>>>>>')) {
      const o = trim(ours), t = trim(theirs);
      const [a, b] = released(t) && !released(o) ? [o, t] : [t, o];
      out.push(...a, ...(a.length && b.length ? [''] : []), ...b);
      mode = 0; gap = true; continue;
    }
    if (mode === 0 && gap && l.trim() !== '' && out.length && out[out.length - 1].trim() !== '') out.push('');
    if (mode === 0) gap = false;
    if (mode === 0) out.push(l); else if (mode === 1) ours.push(l); else if (mode === 2) theirs.push(l);
  }
  return out.join('\n');
}

/** The train PR title: "<version>: Train <n>: <title>". */
/** A build is a train only with a member besides the docs-only feature/menu ride-along (train 44 #292, 2026-10-24). */
export const MENU_BRANCH = 'feature/menu';
export const hasTrainMember = (included) => included.some((b) => b.replace(/^origin\//, '') !== MENU_BRANCH);

export const trainPrTitle = (n, version, title) => `${version}: Train ${n}: ${title}`;

/** The train PR body: members in merge order, then the footer line. */
export function trainPrBody(n, title, members) {
  return [`Train ${n}: ${title}`, '', 'Members (merged into train/' + n + ' in this order):',
    ...members.map((m) => `- ${m.pr ? `#${m.pr}` : '(no open PR)'} \`${m.branch}\``), '',
    'Built and released by `scripts/merge-train.mjs`: one version commit (G183) with the CHANGELOG assembled from',
    "the members' `changes/` fragments; merged only after CI passed on that commit.", '', FOOTER].join('\n');
}

/** Branches a train merged, oldest first, from its first-parent merge subjects ("Merge origin/<b> into train/<n>"). */
export function membersFromLog(subjects) {
  const out = [];
  for (const s of subjects) {
    const m = /^Merge origin\/(.+) into train\/\d+$/.exec(s.trim());
    if (m && m[1] !== 'master' && !out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

/** The subject of a train's version commit (G183); `release` finds the commit by it. */
export const versionSubject = (n, version) => `${version}: version at merge, train ${n} (G183)`;

/** Index of the version commit in first-parent subjects (newest first, 0 = the head), or -1 when absent. */
export function findVersionCommit(subjects, n, version) {
  const want = versionSubject(n, version);
  return subjects.findIndex((s) => s.trim() === want);
}

/** The newest version commit of train `n` for any version in first-parent subjects: { idx, version } or { idx: -1 }. */
export function findTrainVersionCommit(subjects, n) {
  const re = new RegExp(`^(\\d+\\.\\d+\\.\\d+): version at merge, train ${n} \\(G183\\)$`);
  for (let i = 0; i < subjects.length; i++) {
    const m = re.exec(subjects[i].trim());
    if (m) return { idx: i, version: m[1] };
  }
  return { idx: -1, version: null };
}

/** The --keep STOP text over a version commit: the pre-version head (`<version commit>^`) and the exact commands. */
export function keepStopMessage({ n, version, title, versionSha, pre, members, after = 0 }) {
  const b = `train/${n}`;
  return [
    `STOP: origin/${b} already holds the version commit for ${version} (${versionSha.slice(0, 8)}); --keep builds on a head without it.`,
    `To merge a conflicting branch <b> by hand, start from the pre-version head ${pre} (${versionSha.slice(0, 8)}^):`,
    `  git checkout -B ${b} ${pre}`,
    `  git merge --no-ff origin/<b> -m "Merge origin/<b> into ${b}"   (resolve, git add, git commit --no-edit)`,
    `  git push --force origin ${b}`,
    `  node scripts/merge-train.mjs build ${n} ${version} ${JSON.stringify(title)} ${[...members, '<b>'].join(' ')} --keep`,
    ...(after ? [`(${after} commit(s) after the version commit are not on that head: cherry-pick them again after the merge)`] : []),
  ].join('\n');
}

/** The branches whose wire diff decides the PROTOCOL_VERSION bump: the kept command-line branches plus every train member. */
export const wireCandidates = (kept, members) => [...new Set([...kept, ...members.map((m) => m.branch)])];

/** package-lock.json text without its own version (`version`, `packages[""].version`), for an npm ci decision. */
export function lockfileKey(text) {
  const j = JSON.parse(text);
  delete j.version;
  if (j.packages?.['']) delete j.packages[''].version;
  return JSON.stringify(j);
}

/** True when two package-lock.json texts differ beyond the version `npm version` writes (a missing one differs). */
export function lockfilesDiffer(a, b) {
  if (a == null || b == null) return true;
  try { return lockfileKey(a) !== lockfileKey(b); } catch { return true; }
}

/** The comment on a member PR that a train merged. */
export const closeComment = (version, n, pr) => `Merged in ${version} (train ${n}, #${pr})`;

/**
 * What `release` does with a version commit at `idx` of the first-parent subjects (newest first): at the head it is
 * fine; fix commits after it (idx > 0) need --resume. { ok, after: [subjects after it], message }.
 */
export function resumeCheck(subjects, idx, resume) {
  if (idx < 0) return { ok: false, after: [], message: 'no version commit on the train: build it first' };
  const after = subjects.slice(0, idx);
  if (!after.length) return { ok: true, after, message: '' };
  if (!resume) {
    return { ok: false, after, message: `${after.length} commit(s) after the version commit (${after.join(' | ')}); rerun with --resume to release them, or rebuild` };
  }
  return { ok: true, after, message: `resume: ${after.length} commit(s) after the version commit: ${after.join(' | ')}` };
}

/** Paths of the wire: `src/net/` plus every `../x/y` import of protocol.ts as `src/x/y.ts` (a trailing "/" is a folder). */
export function wirePaths(protocolTs) {
  const out = ['src/net/'];
  for (const m of protocolTs.matchAll(/\bfrom\s+'\.\.\/([^']+)'/g)) {
    const p = `src/${m[1]}.ts`;
    if (!out.includes(p)) out.push(p);
  }
  return out;
}

/** True when any changed file is a wire path. */
export function touchesWire(files, paths) {
  return files.some((f) => paths.some((p) => (p.endsWith('/') ? f.startsWith(p) : f === p)));
}

const PROTOCOL_LINE = /^export const PROTOCOL_VERSION = (\d+);/m;

/** The PROTOCOL_VERSION number in protocol.ts text; throws when the line is missing. */
export function protocolValue(text) {
  const m = PROTOCOL_LINE.exec(text);
  if (!m) throw new Error('src/net/protocol.ts has no "export const PROTOCOL_VERSION = <n>;" line');
  return Number(m[1]);
}

/** protocol.ts text with PROTOCOL_VERSION set to masterValue + 1 (always master+1, whatever the head holds). */
export function bumpProtocol(text, masterValue) {
  protocolValue(text);
  return text.replace(PROTOCOL_LINE, `export const PROTOCOL_VERSION = ${masterValue + 1};`);
}

/** The last `count` lines of command output. */
export const tailLines = (out, count) => out.trimEnd().split('\n').slice(-count).join('\n');

/** The vitest run's verdict from its exit status (-1 = timeout / killed) and output: { ok, kind, tail }. */
export function vitestVerdict(status, out) {
  const tail = tailLines(out ?? '', 60);
  if (status === 0) return { ok: true, kind: 'pass', tail };
  return { ok: false, kind: status === -1 ? 'timeout' : 'fail', tail };
}

/** Output with ANSI colour / cursor escape codes removed. */
export const stripAnsi = (text) => String(text ?? '').replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, '');

const FAIL_LINE = /^\s*FAIL\s+(\S+?\.(?:test|spec)\.[cm]?[jt]sx?)(?:\s|$)/;

/**
 * The failed tests in a vitest run's output: [{ file, key, timedOut }], each distinct failure once.
 * Reads the " FAIL  tests/foo.test.ts > suite > test" lines (ANSI codes stripped; vitest prints each in the progress
 * and again in the summary; a line with no " > " is a file-level failure). timedOut: a block under that line (up to
 * the next FAIL line) holds "Test timed out in".
 */
export function failedTests(out) {
  const byKey = new Map();
  let cur = null;
  for (const line of stripAnsi(out).split(/\r?\n/)) {
    const m = FAIL_LINE.exec(line);
    if (m) {
      const key = line.trim().replace(/\s+/g, ' ');
      cur = byKey.get(key) ?? { file: m[1], key, timedOut: false };
      byKey.set(key, cur);
    } else if (cur && line.includes('Test timed out in')) cur.timedOut = true;
  }
  return [...byKey.values()];
}

/** The failed test files in a vitest run's output (first-seen order, each once). */
export const failedTestFiles = (out) => [...new Set(failedTests(out).map((t) => t.file))];

/** Failed files above this count (when not all timeouts) are not rerun. */
export const RERUN_MAX_FILES = 3;

/**
 * Whether a failed full vitest run is rerun on its failed files only: { rerun, files, reason }.
 * Rerun when files failed and either every failure is a timeout ("Test timed out in") or at most 3 files failed.
 * Never after a pass or a killed run (status -1).
 */
export function vitestRerunPlan(status, out) {
  if (status === 0) return { rerun: false, files: [], reason: 'passed' };
  if (status === -1) return { rerun: false, files: [], reason: 'timed out or killed' };
  const tests = failedTests(out);
  const files = [...new Set(tests.map((t) => t.file))];
  if (!files.length) return { rerun: false, files, reason: 'no failed test files in the output' };
  if (tests.every((t) => t.timedOut)) return { rerun: true, files, reason: 'every failure is a timeout' };
  if (files.length <= RERUN_MAX_FILES) return { rerun: true, files, reason: `${files.length} failed file(s)` };
  return { rerun: false, files, reason: `${files.length} failed files, not all timeouts` };
}

/** The isolated rerun command for failed files (no file parallelism: one file at a time). */
export const vitestRerunCmd = (files) => `npx vitest run --no-file-parallelism ${files.join(' ')}`;

/** True when the heavy lock's text names merge-train (so merge-train may remove it). */
export const lockIsOurs = (text) => /^merge-train\s*\|/.test(text.trim());

const USAGE = [
  'usage:',
  '  node scripts/merge-train.mjs build <n> <version> "<title>" <branch>... [--keep] [--no-test] [--dry-run]',
  '  node scripts/merge-train.mjs release <n> <version> "<title>" [--resume] [--head <sha>] [--no-fallback] [--dry-run]',
  '  node scripts/merge-train.mjs single <branch> <version> "<title>" [--dry-run]',
].join('\n');

/** -1 / 0 / 1 comparing two "X.Y.Z" versions numerically. */
export function cmpVersion(a, b) {
  const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) < (pb[i] ?? 0) ? -1 : 1;
  return 0;
}

/** The version race STOP text when `version` is not above master's, else null. */
export function versionRace(version, masterVersion) {
  return cmpVersion(version, masterVersion) > 0 ? null
    : `STOP: version ${version} is not above master's package.json ${masterVersion} (another release landed?): pick the next version`;
}

/** The --head pin STOP text when origin/train/<n> is not the tested sha (prefix match for a short sha), else null. */
export function headPinCheck(actual, want, branch) {
  if (!want || actual.toLowerCase().startsWith(want.toLowerCase())) return null;
  return `STOP: origin/${branch} is ${actual.slice(0, 8)}, not the tested head ${want.slice(0, 8)}: nothing merged`;
}

/** argv (after `node script`) -> { cmd, ...fields, dry }; throws an Error carrying the usage text. */
export function parseArgs(argv0) {
  const FLAGS = ['--dry-run', '--keep', '--no-test', '--resume', '--no-fallback', '--head'];
  const bad = (why) => new Error(`${why}\n${USAGE}`);
  // --head <sha> takes a value: pull it out before the positional parse.
  let headSha = null;
  const argv = [];
  for (let i = 0; i < argv0.length; i++) {
    if (argv0[i] !== '--head') { argv.push(argv0[i]); continue; }
    const v = argv0[++i];
    if (!/^[0-9a-f]{7,40}$/i.test(v ?? '')) throw bad(`--head needs a commit sha, got "${v ?? ''}"`);
    headSha = v.toLowerCase();
    argv.push('--head');
  }
  const unknown = argv.find((x) => x.startsWith('--') && !FLAGS.includes(x));
  if (unknown) throw bad(`unknown flag ${unknown}`);
  const has = (f) => argv.includes(f);
  const [cmd, ...a] = argv.filter((x) => !FLAGS.includes(x));
  const ver = (v) => { if (!/^\d+\.\d+\.\d+$/.test(v ?? '')) throw bad(`version must be X.Y.Z, got "${v}"`); return v; };
  const only = (...ok) => { for (const f of FLAGS.slice(1)) if (has(f) && !ok.includes(f)) throw bad(`${f} does not apply to ${cmd}`); };
  const dry = has('--dry-run');
  if (cmd === 'build') {
    only('--keep', '--no-test');
    if (!/^\d+$/.test(a[0] ?? '')) throw bad('build needs a train number');
    if (!a[2]) throw bad('build needs <version> "<title>"');
    if (a.length < 4) throw bad('build needs at least one branch');
    return { cmd, n: a[0], version: ver(a[1]), title: a[2], branches: a.slice(3), keep: has('--keep'), noTest: has('--no-test'), dry };
  }
  if (cmd === 'release') {
    only('--resume', '--no-fallback', '--head');
    if (!/^\d+$/.test(a[0] ?? '') || !a[2]) throw bad('release needs <n> <version> "<title>"');
    if (a.length > 3) throw bad(`unexpected argument "${a[3]}"`);
    return { cmd, n: a[0], version: ver(a[1]), title: a[2], resume: has('--resume'), head: headSha, noFallback: has('--no-fallback'), dry };
  }
  if (cmd === 'single') {
    only();
    if (!a[0] || !a[2]) throw bad('single needs <branch> <version> "<title>"');
    if (a.length > 3) throw bad(`unexpected argument "${a[3]}"`);
    return { cmd, branch: a[0], version: ver(a[1]), title: a[2], dry };
  }
  throw bad(cmd ? `unknown command "${cmd}"` : 'no command');
}

// ---- shell helpers ----------------------------------------------------------------------------------------------

/** Runs an argv array (no shell) or a string (through the shell); never throws: { status, out, err }. */
function exec(cmd, { input, env, timeout = 600_000 } = {}) {
  const opt = { encoding: 'utf8', input, env, timeout, windowsHide: true, maxBuffer: 256 << 20 };
  const r = Array.isArray(cmd) ? spawnSync(cmd[0], cmd.slice(1), opt) : spawnSync(cmd, { ...opt, shell: true });
  if (r.error) return { status: -1, out: '', err: String(r.error.message) };
  return { status: r.status ?? -1, out: r.stdout ?? '', err: r.stderr ?? '' };
}

/** The command that kills process `pid` and its whole tree (Windows: taskkill /T /F; else null, use a signal). */
export const killTreeCmd = (pid, platform = process.platform) =>
  (platform === 'win32' ? ['taskkill', '/T', '/F', '/PID', String(pid)] : null);

/**
 * Runs a shell command asynchronously; on `timeout` kills its whole process tree (not just the shell, which would
 * leave vitest's node running on Windows) and reports status -1. Never throws: { status, out, err }.
 */
function execTree(cmd, { timeout }) {
  return new Promise((resolve) => {
    const child = spawn(cmd, { shell: true, windowsHide: true });
    let out = '', err = '', timedOut = false;
    child.stdout.setEncoding('utf8').on('data', (d) => { out += d; });
    child.stderr.setEncoding('utf8').on('data', (d) => { err += d; });
    const timer = setTimeout(() => {
      timedOut = true;
      const k = killTreeCmd(child.pid);
      if (k) exec(k); else child.kill('SIGKILL');
    }, timeout);
    child.on('error', (e) => { clearTimeout(timer); resolve({ status: -1, out, err: `${err}${e.message}` }); });
    child.on('close', (code) => { clearTimeout(timer); resolve({ status: timedOut ? -1 : (code ?? -1), out, err }); });
  });
}

const show = (cmd) => (Array.isArray(cmd) ? cmd.map((a) => (/[\s"]/.test(a) ? JSON.stringify(a) : a)).join(' ') : cmd);

/** Runs a command and returns its trimmed stdout (raw with `raw`); throws with the command's stderr. */
export function run(cmd, opts = {}) {
  const r = exec(cmd, opts);
  if (r.status !== 0) throw new Error(`${show(cmd)} failed (${r.status}): ${(r.err || r.out).trim().slice(-2000)}`);
  return opts.raw ? r.out : r.out.trim();
}

/** A command that changes something outside this machine's git objects: printed in a dry run, run otherwise. */
function act(cmd, opts) {
  if (DRY) { console.log(`  [dry-run] would run: ${show(cmd)}`); return ''; }
  console.log(`  > ${show(cmd)}`);
  return run(cmd, opts);
}

const rev = (ref) => run(['git', 'rev-parse', '--verify', '--quiet', `${ref}^{commit}`]);
const exists = (ref) => exec(['git', 'rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).status === 0;
const isAncestor = (a, b) => exec(['git', 'merge-base', '--is-ancestor', a, b]).status === 0;
const today = () => new Date().toLocaleDateString('en-CA');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function requireClean() {
  if (DRY) return;
  const s = run(['git', 'status', '--porcelain']);
  if (s) throw new Error(`the worktree has uncommitted changes; commit or move them first:\n${s}`);
}

/** The open PR number for a head branch, or null. */
function openPr(branch) {
  const n = run(['gh', 'pr', 'list', '--head', branch, '--state', 'open', '--json', 'number', '--jq', '.[0].number // empty']);
  return n ? Number(n) : null;
}

// ---- merging on git objects ---------------------------------------------------------------------------------------

/** Rewrites `files` of `tree` through resolveKeepBoth (a temp index, no worktree); returns the new tree. */
function resolveTree(tree, files) {
  const index = path.join(os.tmpdir(), `merge-train-${process.pid}.index`);
  const env = { ...process.env, GIT_INDEX_FILE: index };
  try {
    run(['git', 'read-tree', tree], { env });
    for (const f of files) {
      const text = resolveKeepBoth(run(['git', 'cat-file', 'blob', `${tree}:${f}`], { raw: true }));
      const blob = run(['git', 'hash-object', '-w', '--stdin'], { input: text });
      run(['git', 'update-index', '--cacheinfo', `100644,${blob},${f}`], { env });
    }
    return run(['git', 'write-tree'], { env });
  } finally { fs.rmSync(index, { force: true }); }
}

/** Merges commit `theirs` into commit `ours`: { sha } (a new merge commit, no ref moved) or { blocking: [files] }. */
function mergeObjects(ours, theirs, message) {
  const r = exec(['git', 'merge-tree', '--write-tree', '--name-only', '--no-messages', ours, theirs]);
  if (r.status !== 0 && r.status !== 1) throw new Error(`git merge-tree failed: ${r.err.trim()}`);
  const [tree, ...files] = r.out.split('\n').map((l) => l.trim()).filter(Boolean);
  let t = tree;
  if (files.length) {
    const { resolvable, blocking } = classifyConflicts([...new Set(files)]);
    if (blocking.length) return { blocking };
    t = resolveTree(tree, resolvable);
    console.log(`  resolved ${resolvable.join(', ')} (both sides kept, incoming first)`);
  }
  return { sha: run(['git', 'commit-tree', t, '-p', ours, '-p', theirs, '-m', message]) };
}

/** Merges origin/master into `head` (release / single): the new head, or null after printing the blocking files. */
function mergeMaster(head, label) {
  if (isAncestor('origin/master', head)) { console.log('origin/master is already in'); return head; }
  const m = mergeObjects(head, rev('origin/master'), `Merge origin/master into ${label}`);
  if (m.sha) { console.log(`merged origin/master: ${m.sha.slice(0, 8)}`); return m.sha; }
  console.error(`STOP: origin/master conflicts with ${label} in ${m.blocking.join(', ')}; send it back to the job lead`);
  return null;
}

/** The changelog assembly a real run would write at `sha`, read from git objects (dry runs). */
function assembleAt(sha, opts) {
  const ls = exec(['git', 'ls-tree', '--name-only', `${sha}:changes`]);
  const names = ls.status === 0 ? ls.out.split('\n').filter((x) => x.endsWith('.md') && x.toLowerCase() !== 'readme.md') : [];
  const blob = (p) => run(['git', 'cat-file', 'blob', `${sha}:${p}`], { raw: true });
  const frags = names.map((x) => ({ name: `changes/${x}`, ...parseFragment(blob(`changes/${x}`), `changes/${x}`) }));
  return assemble(blob('CHANGELOG.md'), frags, opts);
}

/** Lists the failed jobs' log tail of CI run `id`. */
function failTail(id) {
  const log = exec(['gh', 'run', 'view', String(id), '--log-failed']).out.trimEnd().split('\n');
  console.error(log.slice(-40).join('\n'));
}

/** Waits for every CI run on commit `sha` of `branch`; true only when all of them pass. */
async function waitCi(branch, sha) {
  let runs = [];
  for (let i = 0; i < 40 && !runs.length; i++) { // up to ~10 min for the run to register
    const list = JSON.parse(run(['gh', 'run', 'list', '--branch', branch, '--limit', '30', '--json', 'databaseId,headSha,workflowName']));
    runs = list.filter((r) => r.headSha === sha);
    if (!runs.length) await sleep(15_000);
  }
  if (!runs.length) { console.error(`no CI run appeared for ${sha} on ${branch}`); return false; }
  for (const r of runs) {
    console.log(`watching CI run ${r.databaseId} (${r.workflowName}) on ${sha.slice(0, 8)}`);
    // async (not spawnSync) so the train lock heartbeat keeps touching the lock during a long watch
    const w = await execTree(show(['gh', 'run', 'watch', String(r.databaseId), '--exit-status', '--interval', '30']), { timeout: 90 * 60_000 });
    if (w.status !== 0) { console.error(`CI FAILED: run ${r.databaseId}`); failTail(r.databaseId); return false; }
  }
  return true;
}

/** The shared version step of build / release (old style) / single: changelog, `npm version`, add, commit, optional push. */
function versionCommit({ branch, head, checkout, version, title, pr, members, subject, push = true, extraAdd = [] }) {
  const opts = { version, title, date: today(), pr: pr ?? 'NEW', members };
  const heading = releaseHeading(opts.version, opts.title, opts.date, opts.pr, members);
  if (checkout) act(checkout);
  if (DRY) {
    const r = assembleAt(head, opts);
    if (!r) { console.error('STOP (a real run fails here): nothing to assemble'); return { code: 1 }; }
    console.log(summary(r, `CHANGELOG.md would get: ${heading}`));
    if (!r.text) { console.error('STOP (a real run fails here): nothing new to release'); return { code: 1 }; }
  } else {
    const r = assembleDir(run(['git', 'rev-parse', '--show-toplevel']), opts);
    if (!r) throw new Error('nothing to assemble: no changes/*.md fragment and no "## Unreleased - ..." block');
    console.log(summary(r, `CHANGELOG.md: ${heading}`));
    if (!r.text) throw new Error('nothing new to release: every fragment entry is already in CHANGELOG.md');
  }
  act(`npm version ${version} --no-git-tag-version`);
  act(['git', 'add', '-A', 'CHANGELOG.md', 'changes', 'package.json', 'package-lock.json', ...extraAdd]);
  act(['git', 'commit', '-m', subject, '-m', TRAILER]);
  if (push) act(['git', 'push', 'origin', `HEAD:refs/heads/${branch}`]);
  return { sha: DRY ? null : rev('HEAD') };
}

/** The `gh pr merge` argv: always pinned to the head that passed (`--match-head-commit`), so a push after CI cannot merge. */
export const mergeCmd = (pr, sha) => ['gh', 'pr', 'merge', String(pr ?? 'NEW'), '--merge', '--match-head-commit', sha ?? '<tested head>'];

/**
 * The shared tail of release / single: merge the PR at exactly `sha` (the head CI passed on), tag the merge commit,
 * move dev. Returns the merge commit (null in a dry run).
 */
function mergeAndTag({ pr, version, sha }) {
  if (!DRY && !sha) throw new Error('mergeAndTag: no head sha to pin the merge to');
  act(mergeCmd(pr, sha));
  if (DRY) {
    for (const c of [['git', 'tag', `v${version}`, '<merge commit>'], ['git', 'push', 'origin', `v${version}`],
      ['git', 'push', 'origin', '<merge commit>:refs/heads/dev']]) act(c);
    return null;
  }
  const merge = run(['gh', 'pr', 'view', String(pr), '--json', 'mergeCommit', '--jq', '.mergeCommit.oid']);
  run(['git', 'fetch', 'origin']);
  act(['git', 'tag', `v${version}`, merge]);
  act(['git', 'push', 'origin', `v${version}`]);
  act(['git', 'push', 'origin', `${merge}:refs/heads/dev`]);
  console.log(`\nMERGED #${pr} as ${merge}, tagged v${version}, dev moved`);
  return merge;
}

/** CI on commit `sha` of `branch`, then mergeAndTag: 0 merged, 2 CI failed (nothing merged). */
async function ciAndMerge({ branch, sha, pr, version }) {
  if (DRY) console.log(`  [dry-run] would wait for CI on ${sha ? sha.slice(0, 8) : 'that commit'} (gh run list --branch ${branch}, gh run watch --exit-status)`);
  else if (!(await waitCi(branch, sha))) { console.error(`NOT merged: CI failed on ${sha}`); return 2; }
  mergeAndTag({ pr, version, sha });
  return 0;
}

// ---- the heavy lock and the vitest run (item 3) -------------------------------------------------------------------

/** The build's heavy-lock wait in ms: TRAIN_LOCK_WAIT_MIN minutes (a number, 0 or more), 5 when absent or invalid. */
export function heavyLockWaitMs(env = process.env) {
  const raw = env.TRAIN_LOCK_WAIT_MIN;
  const min = raw === undefined || String(raw).trim() === '' ? NaN : Number(raw);
  return (Number.isFinite(min) && min >= 0 ? min : 5) * 60_000;
}

/**
 * Takes the lock atomically (`wx`, scripts/heavy-lock.mjs: a lock whose pid is dead on this host is broken),
 * retrying every `retryMs` up to `maxMs`; throws when it stays held.
 */
export async function takeHeavyLock(lock, text, { retryMs = 30_000, maxMs = heavyLockWaitMs(), sleepFn = sleep, alive } = {}) {
  return takeLockText(lock, text, { retryMs, maxMs, sleepFn, alive });
}

/** Removes the lock only while it names merge-train; true when removed. */
export function releaseHeavyLock(lock) {
  try {
    if (!lockIsOurs(fs.readFileSync(lock, 'utf8'))) return false;
    fs.rmSync(lock, { force: true });
    return true;
  } catch { return false; }
}

/** Runs the whole vitest suite on the checked-out train head under the heavy lock: { ok, message }. */
async function runVitest(n, head, prev) {
  const lock = process.env.HEAVY_LOCK || 'C:/NightShift/heavy.lock';
  if (DRY) {
    console.log('  [dry-run] would run npm ci when package-lock.json (version fields ignored) differs from the previous HEAD or node_modules is missing');
    console.log(`  [dry-run] would take ${lock} (wx, stale pid broken, retry 30 s up to ${heavyLockWaitMs() / 60_000} min), run npx vitest run (20 min timeout, tree killed), release it`);
    console.log(`  [dry-run] when it fails: if every failure is a timeout or at most ${RERUN_MAX_FILES} test files failed, would rerun only those files once (${vitestRerunCmd(['<failed files>'])}, 20 min timeout); a pass there counts as ok`);
    return { ok: true, message: '' };
  }
  const root = run(['git', 'rev-parse', '--show-toplevel']);
  const lockAt = (ref) => { const r = exec(['git', 'show', `${ref}:package-lock.json`]); return r.status === 0 ? r.out : null; };
  const lockChanged = prev && lockfilesDiffer(lockAt(prev), lockAt(head));
  if (lockChanged || !fs.existsSync(path.join(root, 'node_modules'))) act('npm ci', { timeout: 15 * 60_000 });
  else console.log('  package-lock.json unchanged (version fields ignored): no npm ci');
  let taken = false;
  try {
    if (fs.existsSync(path.dirname(lock))) {
      await takeHeavyLock(lock, formatLock(`merge-train | train ${n}`, { pid: process.pid }));
      taken = true;
    } else console.log(`  no heavy lock folder (${path.dirname(lock)}): running without it`);
    console.log('  > npx vitest run');
    const r = await execTree('npx vitest run', { timeout: 20 * 60_000 });
    const full = `${r.out}\n${r.err}`;
    const v = vitestVerdict(r.status, full);
    if (v.ok) { console.log('vitest passed'); return { ok: true, message: '' }; }
    const plan = vitestRerunPlan(r.status, full);
    if (plan.rerun) {
      console.error(`vitest failed (${plan.reason}); rerunning once in isolation: ${plan.files.join(' ')}`);
      const cmd = vitestRerunCmd(plan.files);
      console.log(`  > ${cmd}`);
      const rr = await execTree(cmd, { timeout: 20 * 60_000 });
      const rv = vitestVerdict(rr.status, `${rr.out}\n${rr.err}`);
      if (rv.ok) {
        console.log(`vitest passed on isolated rerun: ${plan.files.join(' ')}`);
        return { ok: true, message: `passed on isolated rerun: ${plan.files.join(' ')}` };
      }
      console.error(`isolated rerun ${rv.kind === 'timeout' ? 'TIMED OUT or was killed' : 'failed'}; last lines:\n${rv.tail}`);
      return { ok: false, message: `vitest FAILED on ${head.slice(0, 8)} (isolated rerun of ${plan.files.join(' ')} also failed): fix on train/${n} then release --resume, or drop the member and rebuild` };
    }
    if (plan.files.length) console.error(`no isolated rerun: ${plan.reason}`);
    console.error(`vitest ${v.kind === 'timeout' ? 'TIMED OUT or was killed' : 'failed'}; last lines:\n${v.tail}`);
    return { ok: false, message: `vitest FAILED on ${head.slice(0, 8)}: fix on train/${n} then release --resume, or drop the member and rebuild` };
  } catch (e) {
    return { ok: false, notRun: true, message: `vitest NOT run on ${head.slice(0, 8)} (${e.message}): the train is pushed; CI's check runs the unit tests, or run vitest by hand` };
  } finally { if (taken) releaseHeavyLock(lock); }
}

// ---- commands -----------------------------------------------------------------------------------------------------

/** First-parent subjects of `origin/master..head`, newest first (the version commit sits at the head of a built train). */
function firstParentSubjects(head) {
  const out = run(['git', 'log', '--first-parent', '--format=%s', `origin/master..${head}`]);
  return out ? out.split('\n') : [];
}

/** The train's members (merge order) with their open PRs, printed. */
function trainMembers(head) {
  const subjects = run(['git', 'log', '--first-parent', '--merges', '--reverse', '--format=%s', `origin/master..${head}`]).split('\n');
  const members = membersFromLog(subjects).map((b) => ({ branch: b, pr: openPr(b) }));
  for (const m of members) console.log(`member ${m.branch}: ${m.pr ? `#${m.pr}` : 'no open PR'}`);
  return members;
}

/** The train PR number: the open one, or a new one (null in a dry run). */
function ensurePr(n, version, title, members) {
  const branch = `train/${n}`;
  const pr = openPr(branch);
  if (pr) { console.log(`train PR: #${pr}`); return pr; }
  const url = act(['gh', 'pr', 'create', '--base', 'master', '--head', branch, '--title', trainPrTitle(n, version, title),
    '--body', trainPrBody(n, title, members)]);
  return url ? Number(url.split('/').pop()) : null;
}

/** The wire decision: members whose diff against master touches a wire path -> the protocol.ts text with master+1, else null. */
function planWire(kept, head) {
  const protoAt = (ref) => run(['git', 'show', `${ref}:src/net/protocol.ts`], { raw: true });
  const atHead = protoAt(head);
  const paths = wirePaths(atHead);
  const wire = [];
  for (const b of kept) {
    const mb = exec(['git', 'merge-base', 'origin/master', `origin/${b}`]);
    if (mb.status !== 0) continue;
    const files = run(['git', 'diff', '--name-only', mb.out.trim(), `origin/${b}`]).split('\n').filter(Boolean);
    if (touchesWire(files, paths)) wire.push(b);
  }
  const master = protocolValue(protoAt('origin/master'));
  if (!wire.length) { console.log(`PROTOCOL_VERSION ${master}: unchanged (no member touches the wire)`); return null; }
  const text = bumpProtocol(atHead, master);
  if (text === atHead) { console.log(`PROTOCOL_VERSION already ${master + 1} at the train head (wire: ${wire.join(', ')})`); return null; }
  console.log(`PROTOCOL_VERSION ${master} -> ${master + 1} (wire: ${wire.join(', ')})`);
  return text;
}

async function build({ n, version, title, branches, keep, noTest }) {
  requireClean();
  run(['git', 'fetch', 'origin']);
  const branch = `train/${n}`;
  const race = versionRace(version, versionAt('origin/master'));
  if (race) { console.error(race); return 1; }
  const prev = DRY ? null : rev('HEAD');
  let head;
  if (keep) {
    if (!exists(`origin/${branch}`)) throw new Error(`--keep: origin/${branch} does not exist`);
    head = rev(`origin/${branch}`);
    const vc = findTrainVersionCommit(firstParentSubjects(head), n);
    if (vc.idx >= 0) {
      const versionSha = rev(`${head}~${vc.idx}`);
      const merged = run(['git', 'log', '--first-parent', '--merges', '--reverse', '--format=%s', `origin/master..${head}`]).split('\n');
      const members = [...new Set([...membersFromLog(merged), ...branches])];
      console.error(keepStopMessage({ n, version: vc.version, title, versionSha, pre: rev(`${versionSha}^`), members, after: vc.idx }));
      return 1;
    }
    console.log(`--keep: starting from origin/${branch} (${head.slice(0, 8)}), not origin/master`);
    if (!isAncestor('origin/master', head)) console.warn('WARNING: origin/master is not in that head; release will STOP (exit 3) until the train is rebuilt');
  } else head = rev('origin/master');
  const included = [], kept = [], left = [];
  for (const b of branches) {
    console.log(`merging origin/${b}`);
    if (!exists(`origin/${b}`)) { left.push({ b, why: 'no such branch on origin' }); continue; }
    if (isAncestor(`origin/${b}`, head)) { console.log('  already in (nothing to merge)'); kept.push(b); continue; }
    const m = mergeObjects(head, rev(`origin/${b}`), `Merge origin/${b} into train/${n}`);
    if (m.blocking) { left.push({ b, why: `conflicts in ${m.blocking.join(', ')}` }); console.log(`  LEFT OUT: ${m.blocking.join(', ')}`); continue; }
    head = m.sha; included.push(b); kept.push(b);
  }
  // feature/menu alone is never a train: nothing is pushed and no PR is opened (exit 3, as with no member)
  if (!hasTrainMember(included) && !keep) {
    console.log(`\ntrain/${n} head: ${head}${DRY ? ' (dry run: an unreferenced commit)' : ''}`);
    console.log(`members: (none)${included.length ? ` - only ${included.join(', ')}, not a train` : ''}`);
    for (const l of left) console.log(`LEFT OUT: ${l.b} - ${l.why}`);
    return 3;
  }
  act(['git', 'checkout', '-B', branch, head]);
  act(keep ? ['git', 'push', 'origin', branch] : ['git', 'push', '--force', 'origin', branch]);
  const members = trainMembers(head);
  const pr = ensurePr(n, version, title, members);
  const protocol = planWire(wireCandidates(kept, members), head);
  if (protocol && DRY) console.log('  [dry-run] would write src/net/protocol.ts and add it to the version commit');
  else if (protocol) fs.writeFileSync(path.join(run(['git', 'rev-parse', '--show-toplevel']), 'src/net/protocol.ts'), protocol);
  let v;
  try {
    v = versionCommit({ branch, head, checkout: null, version, title: `Train ${n}: ${title}`, pr,
      members: members.filter((m) => m.pr).map((m) => m.pr), subject: versionSubject(n, version), push: false,
      extraAdd: protocol ? ['src/net/protocol.ts'] : [] });
  } catch (e) {
    if (!DRY) { // put back what the version step wrote (protocol.ts, CHANGELOG, fragments, package files): the tree was clean
      const r = exec(['git', 'checkout', 'HEAD', '--', 'src/net/protocol.ts', 'CHANGELOG.md', 'changes', 'package.json', 'package-lock.json']);
      console.error(r.status === 0 ? 'restored src/net/protocol.ts and the version step files to HEAD' : `restore FAILED: ${r.err.trim()}`);
    }
    throw e;
  }
  if (v.code) return v.code;
  const sha = v.sha ?? head;
  let verdict = { ok: true, message: '' };
  if (noTest) console.log('--no-test: vitest skipped');
  else verdict = await runVitest(n, sha, prev);
  act(['git', 'push', 'origin', branch]);
  console.log(`\ntrain/${n} head: ${DRY ? `${head} (dry run: an unreferenced commit; the version commit would sit on it)` : sha}`);
  console.log(`members: ${kept.join(', ') || '(none)'}${pr ? ` | train PR #${pr}` : ''}`);
  for (const l of left) console.log(`LEFT OUT: ${l.b} - ${l.why}`);
  if (!verdict.ok) { console.error(`\n${verdict.message}`); return verdict.notRun ? 4 : 2; }
  console.log(`\nnext: node scripts/merge-train.mjs release ${n} ${version} ${JSON.stringify(title)}`);
  return 0;
}

/** The package.json version at `ref`. */
function versionAt(ref) {
  return JSON.parse(run(['git', 'show', `${ref}:package.json`], { raw: true })).version;
}

/** Old-style train (no version commit on it): merge master into it, then the version commit, push, CI, merge. */
async function releaseOld(n, version, title, head0) {
  const branch = `train/${n}`;
  console.log(`origin/${branch} has no version commit for ${version}: old-style release (merge master, version commit, CI, merge)`);
  const race = versionRace(version, versionAt('origin/master'));
  if (race) { console.error(race); return 1; }
  const head = mergeMaster(head0, branch);
  if (!head) return 3;
  const members = trainMembers(head);
  const pr = ensurePr(n, version, title, members);
  const v = versionCommit({ branch, head, checkout: ['git', 'checkout', '-B', branch, head], version, title: `Train ${n}: ${title}`, pr,
    members: members.filter((m) => m.pr).map((m) => m.pr), subject: versionSubject(n, version) });
  if (v.code) return v.code;
  const code = await ciAndMerge({ branch, sha: v.sha, pr, version });
  if (code === 0) closeMembers(members, { n, version, pr });
  return code;
}

/** After a train merged: closes each still-open member PR whose head sha is in origin/master (a dry run only prints). */
function closeMembers(members, { n, version, pr }) {
  for (const m of members.filter((x) => x.pr)) {
    const close = ['gh', 'pr', 'close', String(m.pr), '--comment', closeComment(version, n, pr ?? 'NEW')];
    if (DRY) { act(close); continue; }
    try {
      const [state, sha] = run(['gh', 'pr', 'view', String(m.pr), '--json', 'state,headRefOid', '--jq', '.state + " " + .headRefOid']).split(' ');
      if (state !== 'OPEN') { console.log(`member #${m.pr}: ${state.toLowerCase()}`); continue; }
      if (!exists(sha) || !isAncestor(sha, 'origin/master')) { console.log(`member #${m.pr}: head ${sha.slice(0, 8)} is not in origin/master, left open`); continue; }
      act(close);
    } catch (e) { console.warn(`WARNING: member #${m.pr} not closed: ${e.message}`); }
  }
}

async function release({ n, version, title, resume, head: wantHead, noFallback }) {
  requireClean();
  run(['git', 'fetch', 'origin']);
  const branch = `train/${n}`;
  if (!exists(`origin/${branch}`)) throw new Error(`origin/${branch} does not exist (run build first)`);
  const head = rev(`origin/${branch}`);
  const pin = headPinCheck(head, wantHead, branch);
  if (pin) { console.error(pin); return 1; }
  if (isAncestor(head, 'origin/master')) { console.error(`STOP: origin/${branch} is already merged into origin/master`); return 1; }
  const subjects = firstParentSubjects(head);
  const idx = findVersionCommit(subjects, n, version);
  if (idx < 0) {
    const other = findTrainVersionCommit(subjects, n);
    if (other.idx >= 0) {
      console.error(`STOP: origin/${branch} holds the version commit for ${other.version}, not ${version}: check the version (release ${n} ${other.version} ...)`);
      return 1;
    }
    if (resume) { console.error(`STOP: --resume, but origin/${branch} holds no version commit for ${version} (build it first)`); return 1; }
    if (noFallback) { console.error(`STOP: origin/${branch} has no version commit for ${version} and --no-fallback is set: rebuild it`); return 1; }
    return releaseOld(n, version, title, head);
  }
  if (!isAncestor('origin/master', head)) {
    console.error(`STOP: master moved since build: rebuild with the next version (origin/master is not in origin/${branch})`);
    return 3;
  }
  const race = versionRace(version, versionAt('origin/master'));
  if (race) { console.error(race); return 1; }
  const check = resumeCheck(subjects, idx, resume);
  if (!check.ok) { console.error(`STOP: ${check.message}`); return 1; }
  if (check.message) console.log(check.message);
  const at = versionAt(head);
  if (at !== version) { console.error(`STOP: package.json is ${at} at ${head.slice(0, 8)}, expected ${version}; rebuild`); return 1; }
  if (idx > 0) {
    const added = run(['git', 'diff', '--name-only', '--diff-filter=A', `${head}~${idx}`, head, '--', 'changes'])
      .split('\n').filter((f) => f.endsWith('.md') && !/(^|\/)readme\.md$/i.test(f));
    if (added.length) { console.error(`STOP: changes added after the version commit (${added.join(', ')}); rebuild`); return 1; }
  }
  console.log(`origin/${branch} ${head.slice(0, 8)}: version commit ${idx ? `at ~${idx}` : 'at the head'}, package.json ${at}, master is in`);
  const members = trainMembers(head);
  const pr = ensurePr(n, version, title, members);
  const code = await ciAndMerge({ branch, sha: head, pr, version });
  if (code === 0) closeMembers(members, { n, version, pr });
  return code;
}

async function single({ branch, version, title }) {
  requireClean();
  run(['git', 'fetch', 'origin']);
  if (!exists(`origin/${branch}`)) throw new Error(`origin/${branch} does not exist`);
  const race = versionRace(version, versionAt('origin/master'));
  if (race) { console.error(race); return 1; }
  const pr = openPr(branch);
  if (!pr) throw new Error(`no open PR has head ${branch}`);
  const head = mergeMaster(rev(`origin/${branch}`), branch);
  if (!head) return 3;
  console.log(`PR #${pr} (${branch})`);
  const v = versionCommit({ branch, head, checkout: ['git', 'checkout', '--detach', head], version, title, pr, members: [],
    subject: `${version}: version at merge (G183)` });
  if (v.code) return v.code;
  return ciAndMerge({ branch, sha: v.sha, pr, version });
}

/** The train lock shared with scripts/auto-train.mjs (its tick lock): AUTO_TRAIN_LOCK, else <AUTO_TRAIN_SCRATCH>/auto-train.lock. */
export const trainLockPath = (env = process.env) =>
  env.AUTO_TRAIN_LOCK || path.join(env.AUTO_TRAIN_SCRATCH || 'C:/NightShift/scratch', 'auto-train.lock');

/** True when the train lock already holds `parentText` (AUTO_TRAIN_LOCK_TEXT: auto-train called us under its tick lock). */
export const heldByParent = (lockText, parentText) => !!parentText && lockText != null && lockText.trim() === parentText.trim();

async function main(argv) {
  const args = parseArgs(argv);
  if (DRY) console.log('DRY RUN: nothing is pushed, merged, tagged or checked out\n');
  const go = () => (args.cmd === 'build' ? build(args) : args.cmd === 'release' ? release(args) : single(args));
  if (DRY) return go(); // a dry run moves no ref: no train lock
  const lock = trainLockPath();
  let cur = null;
  try { cur = fs.readFileSync(lock, 'utf8'); } catch { /* absent */ }
  if (heldByParent(cur, process.env.AUTO_TRAIN_LOCK_TEXT)) return go();
  const t = takeTouchLock(lock, `merge-train ${args.cmd}`, { staleMin: TRAIN_LOCK_STALE_MIN });
  if (!t.release) {
    console.error(`STOP: the train lock ${lock} is held ("${t.holder}", touched ${Math.round(t.ageMin)} min ago): an auto-train tick or another merge-train is running; retry later`);
    return 1;
  }
  try { return await go(); } finally { t.release(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (e) => { console.error(`merge-train: ${e.message}`); process.exit(1); });
}
