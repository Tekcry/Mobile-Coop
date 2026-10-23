// Merge train (merge-tools): builds train/<n> from origin/master and ready PR branches, then releases it (or one lone
// PR) through the version step (G183): CHANGELOG from changes/ (scripts/changelog-assemble.mjs), `npm version`, CI on
// that exact commit, and only on a green run the merge, the tag and the dev pointer. It replaces the orchestrator's
// hand-run "Merge procedure" (docs/orchestrator/STATE.md on feature/menu).
// Conflicts: CHANGELOG.md and changes/* are resolved (both sides kept, incoming block first, never a block dropped);
// any other conflicting file leaves that branch out (build) or stops the run (release / single, exit 3).
// The merges are computed on git objects (`git merge-tree`, `git commit-tree`), so --dry-run moves no ref, worktree
// or remote (it only fetches) and prints what a real run would do.
// Usage:
//   node scripts/merge-train.mjs build <n> <branch>... [--dry-run]
//   node scripts/merge-train.mjs release <n> <version> "<title>" [--dry-run]
//   node scripts/merge-train.mjs single <branch> <version> "<title>" [--dry-run]
// Exit: 0 built / merged (or dry run done), 1 usage or other error, 2 CI failed (nothing merged), 3 conflict stop.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { assemble, assembleDir, parseFragment, releaseHeading, summary } from './changelog-assemble.mjs';

const DRY = process.argv.includes('--dry-run');
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

// ---- shell helpers ----------------------------------------------------------------------------------------------

/** Runs an argv array (no shell) or a string (through the shell); never throws: { status, out, err }. */
function exec(cmd, { input, env, timeout = 600_000 } = {}) {
  const opt = { encoding: 'utf8', input, env, timeout, windowsHide: true, maxBuffer: 256 << 20 };
  const r = Array.isArray(cmd) ? spawnSync(cmd[0], cmd.slice(1), opt) : spawnSync(cmd, { ...opt, shell: true });
  if (r.error) return { status: -1, out: '', err: String(r.error.message) };
  return { status: r.status ?? -1, out: r.stdout ?? '', err: r.stderr ?? '' };
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

// ---- commands -----------------------------------------------------------------------------------------------------

function build(n, branches) {
  requireClean();
  run(['git', 'fetch', 'origin']);
  let head = rev('origin/master');
  const included = [], left = [];
  for (const b of branches) {
    console.log(`merging origin/${b}`);
    if (!exists(`origin/${b}`)) { left.push({ b, why: 'no such branch on origin' }); continue; }
    if (isAncestor(`origin/${b}`, head)) { console.log('  already in (nothing to merge)'); continue; }
    const m = mergeObjects(head, rev(`origin/${b}`), `Merge origin/${b} into train/${n}`);
    if (m.blocking) { left.push({ b, why: `conflicts in ${m.blocking.join(', ')}` }); console.log(`  LEFT OUT: ${m.blocking.join(', ')}`); continue; }
    head = m.sha; included.push(b);
  }
  if (included.length) {
    act(['git', 'checkout', '-B', `train/${n}`, head]);
    act(['git', 'push', '--force', 'origin', `train/${n}`]);
  }
  console.log(`\ntrain/${n} head: ${head}${DRY ? ' (dry run: an unreferenced commit)' : ''}`);
  console.log(`members: ${included.join(', ') || '(none)'}`);
  for (const l of left) console.log(`LEFT OUT: ${l.b} - ${l.why}`);
  return included.length ? 0 : 3;
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
    const w = exec(['gh', 'run', 'watch', String(r.databaseId), '--exit-status', '--interval', '30'], { timeout: 90 * 60_000 });
    if (w.status !== 0) { console.error(`CI FAILED: run ${r.databaseId}`); failTail(r.databaseId); return false; }
  }
  return true;
}

/** The shared tail of release / single: changelog, version commit, push, CI, then merge, tag and dev. */
async function finish({ branch, head, checkout, version, title, pr, members, subject }) {
  const opts = { version, title, date: today(), pr: pr ?? 'NEW', members };
  const heading = releaseHeading(opts.version, opts.title, opts.date, opts.pr, members);
  act(checkout);
  if (DRY) {
    const r = assembleAt(head, opts);
    if (!r) { console.error('STOP (a real run fails here): nothing to assemble'); return 1; }
    console.log(summary(r, `CHANGELOG.md would get: ${heading}`));
    if (!r.text) { console.error('STOP (a real run fails here): nothing new to release'); return 1; }
  } else {
    const r = assembleDir(run(['git', 'rev-parse', '--show-toplevel']), opts);
    if (!r) throw new Error('nothing to assemble: no changes/*.md fragment and no "## Unreleased - ..." block');
    console.log(summary(r, `CHANGELOG.md: ${heading}`));
    if (!r.text) throw new Error('nothing new to release: every fragment entry is already in CHANGELOG.md');
  }
  act(`npm version ${version} --no-git-tag-version`);
  act(['git', 'add', '-A', 'CHANGELOG.md', 'changes', 'package.json', 'package-lock.json']);
  act(['git', 'commit', '-m', subject, '-m', TRAILER]);
  act(['git', 'push', 'origin', `HEAD:refs/heads/${branch}`]);
  if (DRY) {
    console.log(`  [dry-run] would wait for CI on that commit (gh run list --branch ${branch}, gh run watch --exit-status)`);
    for (const c of [['gh', 'pr', 'merge', String(pr ?? 'NEW'), '--merge'], ['git', 'tag', `v${version}`, '<merge commit>'],
      ['git', 'push', 'origin', `v${version}`], ['git', 'push', 'origin', '<merge commit>:refs/heads/dev']]) act(c);
    return 0;
  }
  const sha = rev('HEAD');
  if (!(await waitCi(branch, sha))) { console.error(`NOT merged: CI failed on ${sha}`); return 2; }
  act(['gh', 'pr', 'merge', String(pr), '--merge']);
  const merge = run(['gh', 'pr', 'view', String(pr), '--json', 'mergeCommit', '--jq', '.mergeCommit.oid']);
  run(['git', 'fetch', 'origin']);
  act(['git', 'tag', `v${version}`, merge]);
  act(['git', 'push', 'origin', `v${version}`]);
  act(['git', 'push', 'origin', `${merge}:refs/heads/dev`]);
  console.log(`\nMERGED #${pr} as ${merge}, tagged v${version}, dev moved`);
  return 0;
}

async function release(n, version, title) {
  requireClean();
  run(['git', 'fetch', 'origin']);
  const branch = `train/${n}`;
  if (!exists(`origin/${branch}`)) throw new Error(`origin/${branch} does not exist (run build first)`);
  const head = mergeMaster(rev(`origin/${branch}`), branch);
  if (!head) return 3;
  const subjects = run(['git', 'log', '--first-parent', '--merges', '--reverse', '--format=%s', `origin/master..${head}`]).split('\n');
  const members = membersFromLog(subjects).map((b) => ({ branch: b, pr: openPr(b) }));
  for (const m of members) console.log(`member ${m.branch}: ${m.pr ? `#${m.pr}` : 'no open PR'}`);
  let pr = openPr(branch);
  if (pr) console.log(`train PR: #${pr}`);
  else {
    const url = act(['gh', 'pr', 'create', '--base', 'master', '--head', branch, '--title', trainPrTitle(n, version, title),
      '--body', trainPrBody(n, title, members)]);
    pr = url ? Number(url.split('/').pop()) : null;
  }
  return finish({ branch, head, checkout: ['git', 'checkout', '-B', branch, head], version, title: `Train ${n}: ${title}`, pr,
    members: members.filter((m) => m.pr).map((m) => m.pr), subject: `${version}: version at merge, train ${n} (G183)` });
}

async function single(branch, version, title) {
  requireClean();
  run(['git', 'fetch', 'origin']);
  if (!exists(`origin/${branch}`)) throw new Error(`origin/${branch} does not exist`);
  const pr = openPr(branch);
  if (!pr) throw new Error(`no open PR has head ${branch}`);
  const head = mergeMaster(rev(`origin/${branch}`), branch);
  if (!head) return 3;
  console.log(`PR #${pr} (${branch})`);
  return finish({ branch, head, checkout: ['git', 'checkout', '--detach', head], version, title, pr, members: [],
    subject: `${version}: version at merge (G183)` });
}

async function main(argv) {
  const [cmd, ...a] = argv.filter((x) => x !== '--dry-run');
  const ver = (v) => { if (!/^\d+\.\d+\.\d+$/.test(v ?? '')) throw new Error(`version must be X.Y.Z, got "${v}"`); return v; };
  if (DRY) console.log('DRY RUN: nothing is pushed, merged, tagged or checked out\n');
  if (cmd === 'build' && /^\d+$/.test(a[0] ?? '') && a.length > 1) return build(a[0], a.slice(1));
  if (cmd === 'release' && /^\d+$/.test(a[0] ?? '') && a[2]) return release(a[0], ver(a[1]), a[2]);
  if (cmd === 'single' && a[0] && a[2]) return single(a[0], ver(a[1]), a[2]);
  console.error('usage: node scripts/merge-train.mjs build <n> <branch>... | release <n> <version> "<title>" | single <branch> <version> "<title>" [--dry-run]');
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (e) => { console.error(`merge-train: ${e.message}`); process.exit(1); });
}
