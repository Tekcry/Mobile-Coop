// Merge train (merge-tools): builds train/<n> from origin/master and ready PR branches, then releases it (or one lone
// PR) through the version step (G183): CHANGELOG from changes/ (scripts/changelog-assemble.mjs), `npm version`, CI on
// that exact commit, and only on a green run the merge, the tag and the dev pointer. It replaces the orchestrator's
// hand-run "Merge procedure" (docs/orchestrator/STATE.md on feature/menu).
// `build` does the slow work once, in order: merge the members, then (audit 2026-10-24 finding 9) build the version
// commit on git objects (CHANGELOG assembled from the merged members' fragments, PROTOCOL_VERSION to master+1, a
// stacked build: its base head's + 1, when a member touches the wire, package files): a bad fragment, an empty train or
// nothing new stops here with nothing pushed. The version, kind and title come from the members actually merged
// (deriveRelease: a left-out member never names the release). Then ONE push of train/<n> at the version commit (CI and
// the laptop start at once; AUTO_TRAIN_BUILD_MARKER, set by auto-train, is deleted right after it), and only then the
// train PR (the heading names the PR number GitHub will give; a race rewrites it with one more push). No local vitest
// and no heavy.lock wait: CI's `test` job runs the full vitest on that head and release waits for green CI.
// `release` then only checks, waits for green CI on that head, merges (body: DEPLOY_MARKER) and runs the idempotent
// tail: tag v<version> if origin has none, move dev if it lacks the merge, close member PRs in master, dispatch the one
// Pages deploy (deploy.yml, tested_sha) and, after the train lock, wait <= MERGE_TRAIN_DEPLOY_WAIT_MIN (20) for it and
// print whether /preview/version.json serves the version. `release` of a train already in master runs only that tail;
// `repair` runs it for the latest released version. A train built by the
// older script (no version commit) is still released the old way (merge master, version commit, push, CI, merge).
// Conflicts: CHANGELOG.md and changes/* are resolved (both sides kept, incoming block first, never a block dropped);
// any other conflicting file leaves that branch out (build) or stops the run (release / single, exit 3).
// Doc-lint (build): after each member merges, scripts/doc-lint.mjs runs on the merged tree (git objects); a member that
// adds a doc-lint ERROR (e.g. two members together over a doc budget) is left out like a conflict, so CI `lint` cannot
// fail the train head. A lint that cannot run, or a tree whose scripts/doc-lint.mjs differs from this script's copy
// (a member changing the rules), is logged and ends the check for the rest of the build, never a stop.
// The merges are computed on git objects (`git merge-tree`, `git commit-tree`), so --dry-run moves no ref, worktree
// or remote (it only fetches) and prints what a real run would do.
// Usage:
//   node scripts/merge-train.mjs build <n> <version> "<title>" <branch>... [--on <sha>] [--keep] [--no-test] [--dry-run]
//   node scripts/merge-train.mjs release <n> <version> "<title>" [--resume] [--head <sha>] [--no-fallback] [--dry-run]
//   node scripts/merge-train.mjs single <branch> <version> "<title>" [--dry-run]
//   node scripts/merge-train.mjs repair [--dry-run]
// <n> is normalised ("063" -> 63).
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
// with the sha). --no-test: accepted, does nothing (build runs no vitest).
// Job-done (doc-guard): a member PR body line `Job-done: <job>` makes the version commit (build and single) move
// docs/<job>/ to docs/archive/<job>/ and fix the links to it (scripts/job-archive.mjs).
// --resume: release a train with fix commits after its version commit (package.json at the head must still be
// <version>, no new changes/*.md). After a merge, `release` closes member PRs
// whose head is in origin/master with "Merged in <version> (train <n>, #<pr>)".
// --on <sha> (build; overlapping trains, docs/orchestrator/overlap-trains-PLAN.md on feature/menu): build train <n> on
// the head of another unreleased train <m> (sha = origin/train/<m>'s head, m < n, origin/master in it, train m's
// version commit on it, no third train's) instead of origin/master. <version> must be above train m's too; members are
// only the branches merged into train/<n> (train m's are not repeated); PROTOCOL_VERSION is bumped to train m's + 1;
// the train PR body carries `<!-- auto-train:base train/<m> <sha> -->`. Release of a stacked train (master not in its
// head) checks, after train m merged: the marker's base is in the head and in origin/master, tag v<m's version> is on
// origin and its merge commit's second parent is that base, and `git merge-tree --write-tree origin/master <head>` is the
// head's own tree (GitHub's merge then changes nothing that was tested); `gh pr merge` is retried ~2 min on "not
// mergeable" / "base branch was modified"; after the merge the merge commit's tree must equal the head's (exit 5 if not).
// Foreign-version guard (release / single, always on): a first-parent commit of origin/master..head that is another
// train's version commit means the head would pull an unreleased train into master: STOP, exit 4.
// Exit: 0 built / merged / tail repaired (or dry run done), 1 usage or other error (also: --keep over a version commit, a fix commit
// without --resume, a version commit that does not validate (nothing pushed), repair with no merge found, release with a version other than the train's version
// commit, --head mismatch, --no-fallback with no version commit, version not above master's, train lock held, a bad
// --on base), 2 CI failed on release / single (nothing merged), 3 conflict stop (build with no member merged; release
// when master moved since build, or a stacked train whose base or merge tree no longer matches: rebuild), 4 base train
// not merged (foreign version commit, or a stacked train's base / its tag not on origin yet: wait), 5 merged, but the
// merge commit's tree differs from the tested head (stacked release; tagged, dev moved: check master by hand).
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assemble, assembleDir, parseFragment, releaseHeading, summary } from './changelog-assemble.mjs';
import { touchesWire, wirePaths } from './e2e-affected.mjs';
import { fetchOrigin } from './fetch-retry.mjs';
import { takeTouchLock } from './heavy-lock.mjs';
import { archiveInWorktree, archiveMoves, grepReaders, jobDoneJobs, readersNote, rewriteArchiveLinks } from './job-archive.mjs';
import { lintDocs, matchAny } from './doc-lint.mjs';

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

/** The stacked-base marker of a train PR body (`--on`): the base train and its head sha at build. */
export const baseMarker = (train, sha) => `<!-- auto-train:base train/${train} ${sha} -->`;
const MARKER_RE = /^<!-- auto-train:base train\/(\d+) ([0-9a-f]{40}) -->$/m;
const MARKER_LINES = /^<!-- auto-train:base train\/\S* \S* -->\r?\n?/gm;

/** The stacked-base marker in a PR body -> { train, sha } (sha lower case, 40 hex), or null. */
export function parseBaseMarker(body) {
  const m = MARKER_RE.exec(String(body ?? '').toLowerCase());
  return m ? { train: Number(m[1]), sha: m[2] } : null;
}

/** `body` with every base marker removed and, when `base` ({ train, sha }) is set, the new one as the first line. */
export function withBaseMarker(body, base) {
  const rest = String(body ?? '').replace(MARKER_LINES, '');
  return base ? `${baseMarker(base.train, base.sha)}\n${rest}` : rest;
}

/**
 * The train PR body: members in merge order, `notes` (build log lines), then the footer line. A stacked train (`base`:
 * { train, sha, version }) starts with the base marker and says which train it waits for.
 */
export function trainPrBody(n, title, members, notes = [], base = null) {
  return [...(base ? [baseMarker(base.train, base.sha)] : []), `Train ${n}: ${title}`, '',
    ...(base ? [`Stacked on train/${base.train} at ${base.sha.slice(0, 8)}${base.version ? ` (${base.version})` : ''}: released only after train ${base.train} merges.`, ''] : []),
    'Members (merged into train/' + n + ' in this order):',
    ...members.map((m) => `- ${m.pr ? `#${m.pr}` : '(no open PR)'} \`${m.branch}\``), '',
    ...(notes.length ? [...notes, ''] : []),
    'Built and released by `scripts/merge-train.mjs`: one version commit (G183) with the CHANGELOG assembled from',
    "the members' `changes/` fragments; merged only after CI passed on that commit.", '', FOOTER].join('\n');
}

/** True when `files` (paths relative to the repo root) hold a changelog fragment: changes/<name>.md, not the README. */
export const hasFragment = (files) => files.some((f) => /^changes\/[^/]+\.md$/.test(f) && !/^changes\/readme\.md$/i.test(f));

/** The synthesised fragment of a member PR without one: path (the branch with `/` as `-`) and text (changes/README.md format). */
export function syntheticFragment(branch, title, pr) {
  return { file: `changes/${branch.replace(/\//g, '-')}.md`, text: `# ${title}\nkind: patch\n- ${title} (#${pr})\n` };
}

/**
 * The fragment plan (writes nothing): members with an open PR whose branch adds no changes/*.md each get a synthetic
 * fragment. `added(branch)` lists the files the branch adds under changes/ (null: no merge base, skipped); `title(pr)`
 * is the PR title. Returns the fragments ({ pr, file, text }) and the build log lines (also the train PR body notes).
 */
export function fragmentPlan(members, added, title) {
  const frags = [], notes = [];
  for (const m of members.filter((x) => x.pr)) {
    const files = added(m.branch);
    if (!files || hasFragment(files)) continue;
    frags.push({ pr: m.pr, ...syntheticFragment(m.branch, title(m.pr), m.pr) });
    notes.push(`fragment synthesised for #${m.pr}`);
  }
  return { frags, notes };
}

/**
 * Branches a train merged, oldest first, from its first-parent merge subjects ("Merge origin/<b> into train/<n>").
 * With `n`, only merges into train/<n>: a stacked train's log also holds its base train's merges, never its members.
 */
export function membersFromLog(subjects, n = null) {
  const out = [];
  const re = new RegExp(`^Merge origin/(.+) into train/${n == null ? '\\d+' : Number(n)}$`);
  for (const s of subjects) {
    const m = re.exec(s.trim());
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

/** Every train version commit in first-parent subjects (newest first): [{ idx, n, version }]. */
export function trainVersionCommits(subjects) {
  const out = [];
  subjects.forEach((s, idx) => {
    const m = /^(\d+\.\d+\.\d+): version at merge, train (\d+) \(G183\)$/.exec(String(s).trim());
    if (m) out.push({ idx, n: Number(m[2]), version: m[1] });
  });
  return out;
}

/**
 * Guard (a), always on: the first-parent subjects of origin/master..<head> must hold no version commit of a train other
 * than `n` (null for a lone branch: any train's is foreign). One there means merging the head pulls that unreleased
 * train into master. The STOP text (exit 4), or null.
 */
export function foreignVersionStop(subjects, n, branch) {
  const foreign = trainVersionCommits(subjects).filter((v) => n == null || v.n !== Number(n));
  if (!foreign.length) return null;
  const list = foreign.map((v) => `train ${v.n} ${v.version}`).join(', ');
  return `STOP: base train not merged: origin/${branch} carries the version commit of ${list}, not in origin/master; release it first (nothing merged)`;
}

/**
 * The `--on <sha>` base check of `build` (pure; the caller gathers the facts): `trains` are the origin/train/<m> heads
 * ([{ n, sha }], full shas), `subjects` the first-parent subjects of origin/master..<sha>. -> { m, version } (the base
 * train and its version) or { error }.
 */
export function onBaseCheck({ n, sha, trains, masterInBase, baseInMaster, subjects }) {
  const short = sha.slice(0, 8);
  const heads = trains.filter((t) => t.sha === sha && t.n !== Number(n));
  if (!heads.length) return { error: `--on ${short} is not the head of any other origin/train/<m>` };
  const m = Math.max(...heads.map((t) => t.n));
  if (m >= Number(n)) return { error: `--on: the base train/${m} must be below train ${n}` };
  if (baseInMaster) return { error: `--on: train/${m} (${short}) is already in origin/master: build without --on` };
  if (!masterInBase) return { error: `--on: origin/master is not in train/${m} (${short}): train ${m} must be rebuilt first` };
  const vcs = trainVersionCommits(subjects);
  const own = vcs.find((v) => v.n === m);
  if (!own) return { error: `--on: train/${m} (${short}) has no version commit of train ${m} (not built yet?)` };
  const other = vcs.filter((v) => v.n !== m);
  if (other.length) return { error: `--on: train/${m} is itself stacked on train ${other.map((v) => v.n).join(', ')}: depth 2 at most` };
  return { m, version: own.version };
}

/**
 * Check (b) of a stacked release (pure): `marker` is the PR's base marker ({ train, sha } or null), the rest are git
 * facts about it: base in the head / in origin/master, the base train's version and the commit its tag v<version>
 * names on origin (null: no tag), that commit's second parent (the head GitHub merged), and the tree of
 * `git merge-tree --write-tree origin/master <head>` (null: conflict) against the head's tree.
 * -> { ok: true, message } or { ok: false, code (3 rebuild, 4 wait), message }.
 */
export function stackedDecision({ branch, marker, baseInHead, baseInMaster, baseVersion, tagCommit, tagParent, mergeTree, headTree }) {
  const stop = (code, why) => ({ ok: false, code, message: `STOP: ${why}` });
  if (!marker) return stop(3, `master moved since build: rebuild with the next version (origin/master is not in origin/${branch})`);
  const b = `train/${marker.train} ${marker.sha.slice(0, 8)}`;
  if (!baseInHead) return stop(3, `the recorded base ${b} is not in origin/${branch}: rebuild`);
  if (!baseInMaster) return stop(4, `base train not merged: ${b} is not in origin/master yet; release train ${marker.train} first`);
  if (!tagCommit) return stop(4, `base train not released: tag v${baseVersion} (train ${marker.train}) is not on origin yet`);
  if (tagParent !== marker.sha) {
    return stop(3, `train ${marker.train} merged at ${String(tagParent ?? 'no second parent').slice(0, 8)}, not at the recorded base ${marker.sha.slice(0, 8)}: rebuild`);
  }
  if (!mergeTree || mergeTree !== headTree) {
    return stop(3, `merging origin/${branch} into origin/master would ${mergeTree ? 'change the tested tree' : 'conflict'}: rebuild`);
  }
  return { ok: true, message: `stacked on ${b} (v${baseVersion} merged, tagged): the merge into origin/master keeps the tested tree` };
}

/** True when a failed `gh pr merge` may pass on a retry (GitHub still recomputing after the base train merged). */
export const mergeRetryable = (text) => /not mergeable|base branch was modified/i.test(text) && !/head branch was modified/i.test(text);

/**
 * Runs `once()` (-> { ok, why }) until it passes, retrying a mergeRetryable failure every `stepMs` while `budgetMs`
 * lasts. -> { ok, tries, why }.
 */
export async function retryMerge(once, { budgetMs = 120_000, stepMs = 15_000, now = Date.now, wait = (ms) => new Promise((r) => setTimeout(r, ms)), log = () => {} } = {}) {
  const t0 = now();
  for (let tries = 1; ; tries++) {
    const r = once();
    if (r.ok) return { ok: true, tries, why: '' };
    if (!mergeRetryable(r.why) || now() - t0 + stepMs > budgetMs) return { ok: false, tries, why: r.why };
    log(`merge not accepted yet (${String(r.why).trim().split('\n')[0]}): retry ${tries + 1} in ${Math.round(stepMs / 1000)} s`);
    await wait(stepMs);
  }
}

/** The --keep STOP text over a version commit: the pre-version head (`<version commit>^`) and the exact commands. */
export function keepStopMessage({ n, version, title, versionSha, pre, members, after = 0, on = null }) {
  const b = `train/${n}`;
  return [
    `STOP: origin/${b} already holds the version commit for ${version} (${versionSha.slice(0, 8)}); --keep builds on a head without it.`,
    `To merge a conflicting branch <b> by hand, start from the pre-version head ${pre} (${versionSha.slice(0, 8)}^):`,
    `  git checkout -B ${b} ${pre}`,
    `  git merge --no-ff origin/<b> -m "Merge origin/<b> into ${b}"   (resolve, git add, git commit --no-edit)`,
    `  git push --force origin ${b}`,
    `  node scripts/merge-train.mjs build ${n} ${version} ${JSON.stringify(title)} ${[...members, '<b>'].join(' ')}${on ? ` --on ${on}` : ''} --keep`,
    ...(after ? [`(${after} commit(s) after the version commit are not on that head: cherry-pick them again after the merge)`] : []),
  ].join('\n');
}

/** The branches whose wire diff decides the PROTOCOL_VERSION bump: the kept command-line branches plus every train member. */
export const wireCandidates = (kept, members) => [...new Set([...kept, ...members.map((m) => m.branch)])];

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

export { wirePaths, touchesWire };

const PROTOCOL_LINE = /^export const PROTOCOL_VERSION = (\d+);/m;

/** The PROTOCOL_VERSION number in protocol.ts text; throws when the line is missing. */
export function protocolValue(text) {
  const m = PROTOCOL_LINE.exec(text);
  if (!m) throw new Error('src/net/protocol.ts has no "export const PROTOCOL_VERSION = <n>;" line');
  return Number(m[1]);
}

/**
 * protocol.ts text with PROTOCOL_VERSION set to baseValue + 1, whatever the head holds. The base is origin/master's
 * value, or for a stacked train (`--on`) its base train head's (which may already carry that train's bump).
 */
export function bumpProtocol(text, baseValue) {
  protocolValue(text);
  return text.replace(PROTOCOL_LINE, `export const PROTOCOL_VERSION = ${baseValue + 1};`);
}

// ---- release from the merged members, validated on git objects (audit 2026-10-24 finding 9) ----------------------

/** "X.Y.Z" bumped by `kind` (minor: Y+1, Z=0; patch: Z+1). */
export function bumpVersion(version, kind) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version).trim());
  if (!m) throw new Error(`bad version "${version}"`);
  return kind === 'minor' ? `${m[1]}.${Number(m[2]) + 1}.0` : `${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
}

/** The kind a chosen version implies over its base: minor when X or Y moved, else patch. */
export function impliedKind(version, baseVersion) {
  const [a, b] = [String(version).split('.').map(Number), String(baseVersion).split('.').map(Number)];
  return a[0] !== b[0] || a[1] !== b[1] ? 'minor' : 'patch';
}

/** Titles joined with "; " (duplicates and blanks dropped), whole titles up to `max` chars, then "; +k more". */
export function joinTitles(titles, max = 200) {
  const uniq = [...new Set(titles.map((t) => String(t ?? '').trim()).filter(Boolean))];
  let out = '';
  for (let i = 0; i < uniq.length; i++) {
    const next = out ? `${out}; ${uniq[i]}` : uniq[i];
    if (next.length > max && out) return `${out}; +${uniq.length - i} more`;
    out = next;
  }
  return out;
}

/**
 * The release a build actually makes (pure): `assembled` is the changelog assembly of the merged train tree ({ parts,
 * bump }), `planned` the branches asked for, `merged` the ones in the train (merged now or already in). The kind comes
 * from the merged fragments: when it differs from the kind `version` implies over `baseVersion`, the version becomes
 * baseVersion bumped by it. When a planned branch is not in the train, the title is the merged parts' titles (never a
 * left-out member's). -> { version, title, kind, notes: [log lines] }.
 */
export function deriveRelease({ version, title, baseVersion, planned, merged, assembled }) {
  const notes = [];
  const kind = assembled.bump ?? 'patch';
  let v = version;
  if (impliedKind(version, baseVersion) !== kind) {
    v = bumpVersion(baseVersion, kind);
    notes.push(`version ${version} -> ${v}: the merged members make a ${kind} release`);
  }
  let t = title;
  const out = planned.filter((b) => !merged.includes(b));
  if (out.length) {
    const fromParts = joinTitles(assembled.parts.map((p) => p.title));
    if (fromParts && fromParts !== title) { t = fromParts; notes.push(`title "${title}" -> "${t}": ${out.join(', ')} left out`); }
  }
  return { version: v, title: t, kind, notes };
}

/** package.json text with its first "version" field set to `version` (the rest byte for byte). */
export function bumpPackageJson(text, version) {
  if (!/"version":\s*"[^"]*"/.test(text)) throw new Error('package.json has no "version" field');
  return text.replace(/("version":\s*")[^"]*(")/, `$1${version}$2`);
}

/** package-lock.json text with the root and packages[""] versions set (npm's own 2-space format). */
export function bumpPackageLock(text, version) {
  const j = JSON.parse(text);
  j.version = version;
  if (j.packages && j.packages['']) j.packages[''].version = version;
  return `${JSON.stringify(j, null, 2)}\n`;
}

/**
 * The version commit built on git objects (no worktree, no ref moved; `cwd` the repo): the head's tree plus the
 * synthesised fragments and protocol.ts, CHANGELOG assembled (consumed fragments removed), package.json and
 * package-lock.json at the release version. Every check a real run needs happens here, before anything is pushed:
 * a malformed fragment throws, nothing to assemble / nothing new throws. `release(assembled)` -> { version, title }
 * picks the final version and title from the first assembly (deriveRelease); `heading(version, title)` -> the
 * assemble opts. `archive` (jobs named on a member PR's `Job-done: <job>` line, doc-guard): docs/<job>/ moves to
 * docs/archive/<job>/ (`archiveDate` suffix when taken) and every markdown pointer to it is rewritten; a job with no
 * docs/<job>/ is skipped. -> { sha, tree, version, title, assembled, archived: [{ job, from, to, files, rewritten }] }.
 */
export function versionTreeCommit({ head, frags = [], protocol = null, subject, release, opts, cwd, archive = [], archiveDate = '' }) {
  const blob = (p) => run(['git', 'cat-file', 'blob', `${head}:${p}`], { raw: true, cwd });
  const ls = exec(['git', 'ls-tree', '--name-only', `${head}:changes`], { cwd });
  const inTree = ls.status === 0 ? ls.out.split('\n').map((x) => x.trim()).filter((x) => x.endsWith('.md') && x.toLowerCase() !== 'readme.md') : [];
  const texts = new Map(inTree.map((x) => [`changes/${x}`, null]));
  for (const f of frags) if (!texts.has(f.file)) texts.set(f.file, f.text);
  const names = [...texts.keys()].sort();
  const fragments = names.map((name) => ({ name, ...parseFragment(texts.get(name) ?? blob(name), name) }));
  const changelog = blob('CHANGELOG.md');
  const first = assemble(changelog, fragments, opts('0.0.0', 'x'));
  if (!first) throw new Error('nothing to assemble: no changes/*.md fragment and no "## Unreleased - ..." block (empty train?)');
  if (!first.text) throw new Error('nothing new to release: every fragment entry is already in CHANGELOG.md');
  const rel = release(first);
  const assembled = assemble(changelog, fragments, opts(rel.version, rel.title));
  const index = path.join(os.tmpdir(), `merge-train-vc-${process.pid}-${Date.now()}.index`);
  const env = { ...process.env, GIT_INDEX_FILE: index };
  const put = (p, text) => {
    const sha = run(['git', 'hash-object', '-w', '--stdin'], { input: text, cwd });
    run(['git', 'update-index', '--add', '--cacheinfo', `100644,${sha},${p}`], { env, cwd });
  };
  try {
    run(['git', 'read-tree', head], { env, cwd });
    put('CHANGELOG.md', assembled.text);
    put('package.json', bumpPackageJson(blob('package.json'), rel.version));
    if (exec(['git', 'cat-file', '-e', `${head}:package-lock.json`], { cwd }).status === 0) put('package-lock.json', bumpPackageLock(blob('package-lock.json'), rel.version));
    if (protocol) put('src/net/protocol.ts', protocol);
    for (const name of assembled.consumed) {
      if (texts.get(name) == null) run(['git', 'update-index', '--force-remove', name], { env, cwd });
    }
    const archived = archiveJobs({ head, jobs: archive, date: archiveDate, env, cwd, blob, put });
    const tree = run(['git', 'write-tree'], { env, cwd });
    const sha = run(['git', 'commit-tree', tree, '-p', head, '-m', subject(rel.version), '-m', TRAILER], { cwd });
    return { sha, tree, version: rel.version, title: rel.title, assembled, archived };
  } finally { fs.rmSync(index, { force: true }); }
}

/**
 * Job-done archive inside the version commit's index (`env` holds its GIT_INDEX_FILE): each job's docs/<job>/ files
 * move to docs/archive/<name>/ (same blob and mode; a job that code, tests or config read is skipped, logged), then every markdown file outside docs/archive/ and changes/ that
 * names the job's folder, and every moved markdown file, gets its links rewritten (scripts/job-archive.mjs).
 */
function archiveJobs({ head, jobs, date, env, cwd, blob, put }) {
  const done = [];
  if (!jobs.length) return done;
  const listed = (prefix) => run(['git', 'ls-tree', '-r', '--full-tree', head, '--', `${prefix}/`], { cwd }).split('\n').filter(Boolean)
    .map((l) => { const [meta, file] = l.split('\t'); const [mode, , sha] = meta.split(' '); return { mode, sha, file }; });
  const plans = [];
  for (const job of jobs) {
    const readers = grepReaders(job, { cwd, rev: head });
    if (readers.length) { console.log(readersNote(job, readers)); continue; }
    const entries = listed(`docs/${job}`);
    const plan = archiveMoves(job, entries.map((e) => e.file), (to) => listed(to).length > 0 || plans.some((p) => p.to === to), date);
    if (!plan) { console.log(`Job-done: ${job}: no docs/${job}/ on the train head, nothing to archive`); continue; }
    const byFile = new Map(entries.map((e) => [e.file, e]));
    for (const m of plan.moves) {
      const e = byFile.get(m.from);
      run(['git', 'update-index', '--add', '--cacheinfo', `${e.mode},${e.sha},${m.to}`], { env, cwd });
      run(['git', 'update-index', '--force-remove', m.from], { env, cwd });
    }
    plans.push({ ...plan, job });
  }
  if (!plans.length) return done;
  const moved = new Map(plans.flatMap((p) => p.moves).map((m) => [m.from, m.to]));
  const grep = exec(['git', 'grep', '-l', '-F', ...plans.flatMap((p) => ['-e', `${p.job}/`]), head, '--', '*.md'], { cwd });
  const named = grep.status === 0 ? grep.out.split('\n').filter(Boolean).map((l) => l.slice(head.length + 1)) : [];
  const candidates = new Set([...named, ...[...moved.keys()].filter((f) => f.endsWith('.md'))]);
  const rewritten = [];
  for (const file of candidates) {
    if (!moved.has(file) && (/^docs\/archive\//.test(file) || /^changes\//.test(file) || file === 'CHANGELOG.md')) continue;
    const text = blob(file);
    const next = rewriteArchiveLinks(text, file, plans);
    if (next === text) continue;
    put(moved.get(file) ?? file, next);
    rewritten.push(moved.get(file) ?? file);
  }
  for (const p of plans) {
    const r = rewritten.filter((f) => !f.startsWith(`${p.to}/`));
    done.push({ job: p.job, from: p.from, to: p.to, files: p.moves.length, rewritten: r });
  }
  return done;
}

/** The line every merge-train merge commit body carries: Pages deploys it once, by dispatch, after dev moves. */
export const DEPLOY_MARKER = 'merge-train: Pages deploy is dispatched after dev moves';

/**
 * What the idempotent tail still has to do after a merge (pure): `tagCommit` is what v<version> names on origin
 * (null: missing), `devHasMerge` whether origin/dev contains the merge. -> { tag: bool, tagWrong: bool, dev: bool }.
 */
export function tailPlan({ merge, tagCommit, devHasMerge }) {
  return { tag: !tagCommit, tagWrong: !!tagCommit && tagCommit !== merge, dev: !devHasMerge };
}

/** /preview/'s version.json (written by the deploy workflow) -> { version, sha } or null. */
export function parsePreviewVersion(text) {
  try {
    const j = JSON.parse(String(text));
    return j && typeof j.version === 'string' ? { version: j.version, sha: typeof j.sha === 'string' ? j.sha : null } : null;
  } catch { return null; }
}

/** The Pages site root for a GitHub "owner/repo" (project site): https://<owner>.github.io/<repo>/. */
export const pagesRoot = (nameWithOwner) => {
  const [owner, repo] = String(nameWithOwner).split('/');
  return `https://${owner.toLowerCase()}.github.io/${repo}/`;
};

/** Of `git rev-list --first-parent --merges --parents` lines ("M P1 P2"), the merge whose second parent is `head`, or null. */
export function mergeOfHead(lines, head) {
  for (const l of lines) {
    const [m, , p2] = l.trim().split(/\s+/);
    if (p2 && p2 === head) return m;
  }
  return null;
}

const USAGE = [
  'usage:',
  '  node scripts/merge-train.mjs build <n> <version> "<title>" <branch>... [--on <sha>] [--keep] [--no-test] [--dry-run]',
  '  node scripts/merge-train.mjs release <n> <version> "<title>" [--resume] [--head <sha>] [--no-fallback] [--dry-run]',
  '  node scripts/merge-train.mjs single <branch> <version> "<title>" [--dry-run]',
  '  node scripts/merge-train.mjs repair [--dry-run]',
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

/** A train number as typed ("063") -> its canonical text ("63"): branch names, merge subjects and members agree. */
export const trainNo = (n) => String(Number(n));

/** argv (after `node script`) -> { cmd, ...fields, dry }; throws an Error carrying the usage text. */
export function parseArgs(argv0) {
  const FLAGS = ['--dry-run', '--keep', '--no-test', '--resume', '--no-fallback', '--head', '--on'];
  const bad = (why) => new Error(`${why}\n${USAGE}`);
  // --head <sha> / --on <sha> take a value: pull it out before the positional parse.
  const shas = { '--head': null, '--on': null };
  const argv = [];
  for (let i = 0; i < argv0.length; i++) {
    if (!(argv0[i] in shas)) { argv.push(argv0[i]); continue; }
    const f = argv0[i], v = argv0[++i];
    if (!/^[0-9a-f]{7,40}$/i.test(v ?? '')) throw bad(`${f} needs a commit sha, got "${v ?? ''}"`);
    shas[f] = v.toLowerCase();
    argv.push(f);
  }
  const headSha = shas['--head'];
  const unknown = argv.find((x) => x.startsWith('--') && !FLAGS.includes(x));
  if (unknown) throw bad(`unknown flag ${unknown}`);
  const has = (f) => argv.includes(f);
  const [cmd, ...a] = argv.filter((x) => !FLAGS.includes(x));
  const ver = (v) => { if (!/^\d+\.\d+\.\d+$/.test(v ?? '')) throw bad(`version must be X.Y.Z, got "${v}"`); return v; };
  const only = (...ok) => { for (const f of FLAGS.slice(1)) if (has(f) && !ok.includes(f)) throw bad(`${f} does not apply to ${cmd}`); };
  const dry = has('--dry-run');
  if (cmd === 'build') {
    only('--keep', '--no-test', '--on');
    if (!/^\d+$/.test(a[0] ?? '')) throw bad('build needs a train number');
    if (!a[2]) throw bad('build needs <version> "<title>"');
    if (a.length < 4) throw bad('build needs at least one branch');
    return { cmd, n: trainNo(a[0]), version: ver(a[1]), title: a[2], branches: a.slice(3), keep: has('--keep'), noTest: has('--no-test'), on: shas['--on'], dry };
  }
  if (cmd === 'release') {
    only('--resume', '--no-fallback', '--head');
    if (!/^\d+$/.test(a[0] ?? '') || !a[2]) throw bad('release needs <n> <version> "<title>"');
    if (a.length > 3) throw bad(`unexpected argument "${a[3]}"`);
    return { cmd, n: trainNo(a[0]), version: ver(a[1]), title: a[2], resume: has('--resume'), head: headSha, noFallback: has('--no-fallback'), dry };
  }
  if (cmd === 'repair') {
    only();
    if (a.length) throw bad(`unexpected argument "${a[0]}"`);
    return { cmd, dry };
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
function exec(cmd, { input, env, cwd, timeout = 600_000 } = {}) {
  const opt = { encoding: 'utf8', input, env, cwd, timeout, windowsHide: true, maxBuffer: 256 << 20 };
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

/** The tree sha of commit `ref` (`cwd`: the repository, default the current directory). */
export const treeOf = (ref, cwd) => run(['git', 'rev-parse', `${ref}^{tree}`], { cwd });

/** The tree `git merge-tree --write-tree <ours> <theirs>` writes (what a merge of the two would hold), or null on a conflict. */
export function mergedTree(ours, theirs, cwd) {
  const r = exec(['git', 'merge-tree', '--write-tree', '--no-messages', ours, theirs], { cwd });
  if (r.status === 1) return null;
  if (r.status !== 0) throw new Error(`git merge-tree failed: ${r.err.trim()}`);
  return r.out.split('\n')[0].trim();
}

/** The commit tag `tag` names on origin (peeled), or null when origin has no such tag. */
function remoteTagCommit(tag) {
  const lines = run(['git', 'ls-remote', 'origin', `refs/tags/${tag}`, `refs/tags/${tag}^{}`]).split('\n').filter(Boolean)
    .map((l) => l.split(/\s+/));
  const peeled = lines.find((l) => l[1] === `refs/tags/${tag}^{}`) ?? lines.find((l) => l[1] === `refs/tags/${tag}`);
  return peeled ? peeled[0] : null;
}
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

/** The open PR for a head branch with its body: { number, body }, or null. */
function openPrInfo(branch) {
  const list = JSON.parse(run(['gh', 'pr', 'list', '--head', branch, '--state', 'open', '--json', 'number,body,title']) || '[]');
  return list.length ? { number: Number(list[0].number), body: String(list[0].body ?? ''), title: String(list[0].title ?? '') } : null;
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

// ---- doc-lint on the merged tree (audit 2026-10-26: trains 111 and 112 each failed CI `lint` on one line over a doc
// budget that no member broke alone, ~7 h lost; build now leaves out the member whose merge adds a doc-lint ERROR)

/** A doc-lint ERROR's identity across merges: check, file and message with numbers blanked (a count that moves keeps it). */
export const lintKey = (f) => `${f.check}|${f.file}|${f.msg.replace(/\d+/g, '#')}`;

/** The ERRORs of `after` whose key no ERROR of `before` has (what one merge added). */
export function newLintErrors(before, after) {
  const had = new Set(before.filter((f) => f.level === 'ERROR').map(lintKey));
  return after.filter((f) => f.level === 'ERROR' && !had.has(lintKey(f)));
}

/** The LEFT OUT reason for a member that added doc-lint ERRORs (at most `max` named). */
export function lintWhy(errors, max = 2) {
  const named = errors.slice(0, max).map((f) => `${f.file}:${f.line} ${f.msg}`).join('; ');
  return `doc-lint with master and the members before it: ${named}${errors.length > max ? ` (+${errors.length - max} more)` : ''}`;
}

/** Splits `git cat-file --batch` output (a Buffer) into the blobs' texts, in request order (a missing one: null). */
export function parseCatFileBatch(buf) {
  const out = [];
  let pos = 0;
  while (pos < buf.length) {
    const nl = buf.indexOf(10, pos);
    if (nl < 0) break;
    const header = buf.subarray(pos, nl).toString('utf8').split(' ');
    if (header[1] === 'missing' || header.length < 3) { out.push(null); pos = nl + 1; continue; }
    const size = Number(header[2]);
    out.push(buf.subarray(nl + 1, nl + 1 + size).toString('utf8'));
    pos = nl + 1 + size + 1;
  }
  return out;
}

/** doc-lint findings for the tree of commit `sha`, read from git objects (no worktree; scripts/doc-lint.mjs rules). */
export function docLintAt(sha, cwd) {
  const paths = run(['git', 'ls-tree', '-r', '-z', '--name-only', sha], { cwd, raw: true }).split('\0').filter(Boolean);
  const set = new Set(paths), dirs = new Set();
  for (const p of paths) {
    let d = path.posix.dirname(p);
    while (d && d !== '.' && !dirs.has(d)) { dirs.add(d); d = path.posix.dirname(d); }
  }
  const configs = ['docs/stale-terms.json', 'docs/doc-owners.json', 'docs/doc-lint.json'];
  const read = (list) => {
    const r = spawnSync('git', ['cat-file', '--batch'], { cwd, input: list.map((p) => `${sha}:${p}\n`).join(''), maxBuffer: 1 << 30, windowsHide: true });
    if (r.status !== 0) throw new Error(`git cat-file --batch failed: ${String(r.stderr ?? r.error?.message ?? '').trim()}`);
    return parseCatFileBatch(r.stdout);
  };
  const [stale, owners, lint] = read(configs).map((t) => JSON.parse(t ?? '{}'));
  const md = paths.filter((p) => p.endsWith('.md') && matchAny(p, lint.include ?? ['**/*.md']) && !matchAny(p, lint.exclude ?? []));
  const texts = read(md);
  const files = new Map(md.map((p, i) => [p, texts[i] ?? '']));
  const exists = (p) => { const q = p.replace(/^\.\//, '').replace(/\/+$/, ''); return set.has(q) || dirs.has(q); };
  return lintDocs({ files, exists, config: { staleTerms: stale, owners, lint }, today: today() });
}

/**
 * True when the tree of `sha` holds the same scripts/doc-lint.mjs as the one this script imports (`runner`): only then
 * do docLintAt's findings match what CI runs on that tree (a member may change the rules with the docs that need them).
 */
export function sameLintRules(sha, cwd, runner = fileURLToPath(new URL('./doc-lint.mjs', import.meta.url))) {
  const r = exec(['git', 'rev-parse', `${sha}:scripts/doc-lint.mjs`], { cwd });
  return r.status === 0 && r.out.trim() === run(['git', 'hash-object', runner], { cwd });
}

/** docLintAt that never stops a build: null (logged) when the tree's doc-lint rules differ or the lint itself fails. */
function docLintSafe(sha) {
  try {
    if (!sameLintRules(sha)) { console.log(`  doc-lint: scripts/doc-lint.mjs differs at ${sha.slice(0, 8)}, not checked from here on`); return null; }
    return docLintAt(sha);
  } catch (e) { console.warn(`WARNING: doc-lint on ${sha.slice(0, 8)} failed, not checked from here on: ${e.message}`); return null; }
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
function versionCommit({ branch, head, checkout, version, title, pr, members, subject, push = true, extraAdd = [], archive = [] }) {
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
  const moved = [];
  if (archive.length && DRY) console.log(`  [dry-run] would archive docs/<job>/ for Job-done: ${archive.join(', ')}`);
  else if (archive.length) {
    for (const a of archiveInWorktree({ root: run(['git', 'rev-parse', '--show-toplevel']), jobs: archive, date: today() })) {
      console.log(`archive (Job-done: ${a.job}): ${a.from}/ -> ${a.to}/ in the version commit (${a.files} files; links fixed in ${a.rewritten.length} other docs)`);
      moved.push(a.to, ...a.rewritten);
    }
  }
  act(`npm version ${version} --no-git-tag-version`);
  act(['git', 'add', '-A', 'CHANGELOG.md', 'changes', 'package.json', 'package-lock.json', ...extraAdd, ...moved]);
  act(['git', 'commit', '-m', subject, '-m', TRAILER]);
  if (push) act(['git', 'push', 'origin', `HEAD:refs/heads/${branch}`]);
  return { sha: DRY ? null : rev('HEAD') };
}

/** The `gh pr merge` argv: always pinned to the head that passed (`--match-head-commit`), so a push after CI cannot merge. */
export const mergeCmd = (pr, sha) => ['gh', 'pr', 'merge', String(pr ?? 'NEW'), '--merge', '--match-head-commit', sha ?? '<tested head>',
  '--body', DEPLOY_MARKER]; // the push deploy and dev's Preview check skip this merge: the tail dispatches the one deploy

/** `gh pr merge` pinned to `sha`; a stacked release retries ~2 min while GitHub settles after the base train merged. */
async function mergePinned(pr, sha, stacked) {
  const cmd = mergeCmd(pr, sha);
  if (DRY || !stacked) { act(cmd); return; }
  console.log(`  > ${show(cmd)} (retried up to ~2 min on "not mergeable" / "base branch was modified")`);
  const r = await retryMerge(() => {
    const x = exec(cmd);
    return { ok: x.status === 0, why: (x.err || x.out).trim() };
  }, { wait: sleep, log: (l) => console.warn(`  ${l}`) });
  if (!r.ok) throw new Error(`${show(cmd)} failed after ${r.tries} tries: ${r.why.slice(-2000)}`);
}

/**
 * The shared tail of release / single: merge the PR at exactly `sha` (the head CI passed on), tag the merge commit,
 * move dev. A stacked release then asserts (c): the merge commit's tree is the tested head's (else exit 5, loud).
 * Returns { merge (null in a dry run), code (0, or 5 on a tree mismatch) }.
 */
async function mergeAndTag({ pr, version, sha, stacked = false, n = null, members = [] }) {
  if (!DRY && !sha) throw new Error('mergeAndTag: no head sha to pin the merge to');
  await mergePinned(pr, sha, stacked);
  if (DRY) {
    for (const c of [['git', 'push', 'origin', `<merge commit>:refs/tags/v${version}`],
      ['git', 'push', 'origin', '<merge commit>:refs/heads/dev']]) act(c);
    closeMembers(members, { n, version, pr });
    act(deployDispatchCmd(version, sha));
    if (stacked) console.log('  [dry-run] would assert tree(merge commit) == tree(tested head)');
    return { merge: null, code: 0 };
  }
  const merge = run(['gh', 'pr', 'view', String(pr), '--json', 'mergeCommit', '--jq', '.mergeCommit.oid']);
  // the merge commit (and the member heads closeMembers checks) are in master; narrow + lock-race retry (fetch-retry.mjs)
  fetchOrigin(exec, ['master', 'dev']); // dev: releaseTail reads origin/dev after the train merge
  console.log(`
MERGED #${pr} as ${merge}`);
  releaseTail({ n, version, pr, head: sha, merge, members });
  if (stacked) {
    const [got, want] = [treeOf(merge), treeOf(sha)];
    if (got !== want) {
      console.error(`\n!!! TREE MISMATCH: merge commit ${merge.slice(0, 8)} has tree ${got.slice(0, 8)}, the tested head ${sha.slice(0, 8)} has ${want.slice(0, 8)}.`);
      console.error('!!! origin/master now holds a tree no run tested: check it by hand (state error, exit 5).');
      return { merge, code: 5 };
    }
    console.log(`tree check: merge commit tree == tested head tree (${got.slice(0, 8)})`);
  }
  return { merge, code: 0 };
}

/** CI on commit `sha` of `branch`, then mergeAndTag: 0 merged, 2 CI failed (nothing merged), 5 merged with a tree mismatch. */
async function ciAndMerge({ branch, sha, pr, version, stacked = false, n = null, members = [] }) {
  if (DRY) console.log(`  [dry-run] would wait for CI on ${sha ? sha.slice(0, 8) : 'that commit'} (gh run list --branch ${branch}, gh run watch --exit-status)`);
  else if (!(await waitCi(branch, sha))) { console.error(`NOT merged: CI failed on ${sha}`); return 2; }
  return (await mergeAndTag({ pr, version, sha, stacked, n, members })).code;
}

// ---- the idempotent tail: tag, dev, member PRs, one Pages deploy (safe to re-run after dying at any point) -------

/** Work run after the train lock is released (the deploy wait): a hand run does not hold the lock for it. */
const AFTER_LOCK = [];

/** The deploy dispatch: deploy.yml on master with the tested head, so it skips lint / vitest on that tree. */
export const deployDispatchCmd = (version, head) =>
  ['gh', 'workflow', 'run', 'deploy.yml', '--ref', 'master', '-f', `tested_sha=${head ?? '<tested head>'}`, '-f', `version=${version}`];

/**
 * After the merge (or found merged by `release` / `repair`): tag v<version> on the merge when origin has no such
 * tag, move dev to the merge when dev does not contain it, close member PRs whose heads are in origin/master, and
 * (when dev moved now, or `deploy`) dispatch the one Pages deploy and queue its bounded wait + /preview/ check.
 */
function releaseTail({ n, version, pr, head, merge, members, deploy = false }) {
  const tagCommit = remoteTagCommit(`v${version}`);
  const devHasMerge = exists('origin/dev') && isAncestor(merge, 'origin/dev');
  const plan = tailPlan({ merge, tagCommit, devHasMerge });
  if (plan.tagWrong) console.warn(`WARNING: tag v${version} on origin names ${tagCommit.slice(0, 8)}, not the merge ${merge.slice(0, 8)}: left as it is`);
  if (plan.tag) act(['git', 'push', 'origin', `${merge}:refs/tags/v${version}`]);
  else console.log(`tag v${version}: already on origin`);
  if (plan.dev) act(['git', 'push', 'origin', `${merge}:refs/heads/dev`]);
  else console.log('dev: already contains the merge');
  closeMembers(members, { n, version, pr });
  console.log(`tail done: v${version} ${plan.tag ? 'tagged now' : 'tagged'}, dev ${plan.dev ? 'moved now' : 'current'}`);
  if (plan.dev || deploy) { // a failed dispatch never fails the release: `repair` dispatches again while /preview/ is stale
    const since = Date.now();
    if (DRY) act(deployDispatchCmd(version, head));
    else {
      console.log(`  > ${show(deployDispatchCmd(version, head))}`);
      const d = exec(deployDispatchCmd(version, head));
      if (d.status === 0) AFTER_LOCK.push(() => waitDeploy({ version, since }));
      else console.warn(`PREVIEW: STALE - deploy dispatch failed: ${(d.err || d.out).trim().split('\n')[0]} (rerun: node scripts/merge-train.mjs repair)`);
    }
  }
  return plan;
}

/** The deploy wait budget (minutes): MERGE_TRAIN_DEPLOY_WAIT_MIN, default 20; 0 = dispatch only. */
export const deployWaitMin = (env = process.env) => {
  const v = Number(env.MERGE_TRAIN_DEPLOY_WAIT_MIN ?? 20);
  return Number.isFinite(v) && v >= 0 ? v : 20;
};

/** The /preview/ version.json URL (MERGE_TRAIN_PAGES_URL overrides the site root), cache-busted. */
function previewVersionUrl() {
  const root = process.env.MERGE_TRAIN_PAGES_URL
    || pagesRoot(run(['gh', 'repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner']));
  return `${root.replace(/\/?$/, '/')}preview/version.json?t=${Date.now()}`;
}

/**
 * Waits (bounded) for the dispatched deploy run, then fetches /preview/version.json until it names `version`. Prints
 * one "PREVIEW: OK | STALE | UNKNOWN" line; never throws and never changes the exit code (the release is done).
 */
async function waitDeploy({ version, since }) {
  const budget = deployWaitMin() * 60_000;
  if (!budget) { console.log('PREVIEW: UNKNOWN - deploy dispatched, no wait (MERGE_TRAIN_DEPLOY_WAIT_MIN=0)'); return; }
  const t0 = Date.now(), left = () => budget - (Date.now() - t0);
  try {
    let id = null;
    while (!id && left() > 0 && Date.now() - t0 < 180_000) {
      const list = JSON.parse(exec(['gh', 'run', 'list', '--workflow', 'deploy.yml', '--event', 'workflow_dispatch', '--limit', '5',
        '--json', 'databaseId,createdAt']).out || '[]');
      id = list.find((r) => Date.parse(r.createdAt) >= since - 60_000)?.databaseId ?? null;
      if (!id) await sleep(10_000);
    }
    if (!id) { console.warn('PREVIEW: UNKNOWN - no deploy run appeared within 3 min of the dispatch'); return; }
    console.log(`watching deploy run ${id} (up to ${Math.round(left() / 60_000)} min)`);
    const w = await execTree(show(['gh', 'run', 'watch', String(id), '--exit-status', '--interval', '30']), { timeout: Math.max(left(), 1000) });
    if (w.status !== 0) { console.warn(`PREVIEW: STALE - deploy run ${id} ${w.status === -1 ? 'still running at the wait limit' : 'failed'}`); return; }
    let seen = null;
    const base = previewVersionUrl().replace(/\?t=\d+$/, '');
    const url = () => `${base}?t=${Date.now()}`;
    for (let i = 0; i < 12; i++) { // Pages may take a minute or two to serve the new artifact
      const r = await fetch(url(), { cache: 'no-store' }).then((x) => (x.ok ? x.text() : null), () => null);
      seen = parsePreviewVersion(r);
      if (seen?.version === version) { console.log(`PREVIEW: OK - /preview/ serves ${version}${seen.sha ? ` (${seen.sha})` : ''}`); return; }
      await sleep(15_000);
    }
    console.warn(`PREVIEW: STALE - /preview/ serves ${seen ? seen.version : 'no version.json'}, expected ${version}`);
  } catch (e) { console.warn(`PREVIEW: UNKNOWN - ${e.message}`); }
}

/** Train `n`'s members (merge order) between `from` and `head` (after a merge: `<merge>^1`), with their PRs. */
function membersBetween(from, head, n) {
  if (n == null) return [];
  const subjects = run(['git', 'log', '--first-parent', '--merges', '--reverse', '--format=%s', `${from}..${head}`]).split('\n');
  return membersFromLog(subjects, n).map((b) => {
    try { return { branch: b, pr: openPr(b) }; } catch (e) { console.warn(`WARNING: member ${b}: PR lookup failed (${e.message.split('\n')[0]})`); return { branch: b, pr: null }; }
  });
}

/**
 * The tail for a head already in origin/master: finds the merge commit whose second parent is `head` (recent
 * first-parent merges), then releaseTail. 0 done, 1 no such merge or the version does not match.
 */
function repairHead({ n, version, head, deploy = false }) {
  const lines = run(['git', 'rev-list', '--first-parent', '--merges', '--parents', '-n', '200', 'origin/master']).split('\n');
  const merge = mergeOfHead(lines, head);
  if (!merge) { console.error(`STOP: ${head.slice(0, 8)} is in origin/master but no recent merge has it as its second parent: repair by hand`); return 1; }
  const at = versionAt(merge);
  if (at !== version) { console.error(`STOP: package.json at the merge ${merge.slice(0, 8)} is ${at}, not ${version}`); return 1; }
  const pr = /^Merge pull request #(\d+)/.exec(run(['git', 'log', '-1', '--format=%s', merge]))?.[1] ?? null;
  console.log(`repair: ${version}${n != null ? ` (train ${n})` : ''} merged as ${merge.slice(0, 8)}${pr ? ` (#${pr})` : ''}`);
  releaseTail({ n, version, pr, head, merge, members: membersBetween(`${merge}^1`, head, n), deploy });
  return 0;
}

/** `repair`: the tail for the latest released version (origin/master's package.json): tag, dev, members, deploy. */
async function repair() {
  fetchOrigin(exec, ['master', 'dev']); // releaseTail reads origin/master and origin/dev; lock-race retry
  const version = versionAt('origin/master');
  const hit = run(['git', 'log', 'origin/master', '-n', '1', '--format=%H%x09%s', '-F', `--grep=${version}: version at merge`]);
  if (!hit) { console.error(`STOP: no version commit for ${version} in origin/master`); return 1; }
  const [vsha, subject] = hit.split('\t');
  const n = /, train (\d+) \(G183\)$/.exec(subject)?.[1] ?? null;
  const lines = run(['git', 'rev-list', '--first-parent', '--merges', '--parents', '-n', '200', 'origin/master']).split('\n');
  const row = lines.map((l) => l.trim().split(/\s+/)).find(([, p1, p2]) => p2 && isAncestor(vsha, p2) && !isAncestor(vsha, p1));
  if (!row) { console.error(`STOP: no merge on origin/master brings in the version commit ${vsha.slice(0, 8)}`); return 1; }
  // deploy: dispatch when dev moved now, or when /preview/ does not serve the version yet
  let stale = true;
  try { stale = parsePreviewVersion(await fetch(previewVersionUrl(), { cache: 'no-store' }).then((x) => (x.ok ? x.text() : null)))?.version !== version; } catch { /* unknown: deploy */ }
  if (!stale) console.log(`/preview/ already serves ${version}`);
  return repairHead({ n, version, head: row[2], deploy: stale });
}

// ---- commands -----------------------------------------------------------------------------------------------------

/** First-parent subjects of `origin/master..head`, newest first (the version commit sits at the head of a built train). */
function firstParentSubjects(head) {
  const out = run(['git', 'log', '--first-parent', '--format=%s', `origin/master..${head}`]);
  return out ? out.split('\n') : [];
}

/** Train `n`'s members (merge order) with their open PRs, printed (a stacked base train's merges are not its members). */
function trainMembers(head, n) {
  const subjects = run(['git', 'log', '--first-parent', '--merges', '--reverse', '--format=%s', `origin/master..${head}`]).split('\n');
  const members = membersFromLog(subjects, n).map((b) => ({ branch: b, pr: openPr(b) }));
  for (const m of members) console.log(`member ${m.branch}: ${m.pr ? `#${m.pr}` : 'no open PR'}`);
  return members;
}

/**
 * Read only (git diffs, gh titles; a failure throws before anything is written): the patch fragments for members with
 * an open PR whose branch adds no changes/*.md (a test-only PR), printed. They go straight into the version commit's
 * assembly on git objects (versionTreeCommit), never into a worktree.
 */
function planFragments(members) {
  const added = (branch) => {
    const mb = exec(['git', 'merge-base', 'origin/master', `origin/${branch}`]);
    if (mb.status !== 0) return null;
    return run(['git', 'diff', '--name-only', '--diff-filter=A', mb.out.trim(), `origin/${branch}`, '--', 'changes']).split('\n').filter(Boolean);
  };
  const plan = fragmentPlan(members, added, (pr) => run(['gh', 'pr', 'view', String(pr), '--json', 'title', '--jq', '.title']));
  for (const f of plan.frags) console.log(`fragment synthesised for #${f.pr}: ${f.file}`);
  return plan;
}

/**
 * Read only: the jobs whose docs the version commit archives, from the member PR bodies' `Job-done: <job>` lines
 * (doc-guard; scripts/job-archive.mjs), printed. A body that cannot be read is logged and skipped (never fatal).
 */
function jobsDone(members) {
  const jobs = [];
  for (const m of members) {
    if (!m.pr) continue;
    const r = exec(['gh', 'pr', 'view', String(m.pr), '--json', 'body', '--jq', '.body']);
    if (r.status !== 0) { console.warn(`Job-done: could not read #${m.pr}'s body (${r.err.trim().slice(0, 200)}): its docs are not archived`); continue; }
    for (const job of jobDoneJobs(r.out)) {
      console.log(`Job-done: ${job} (#${m.pr} ${m.branch})`);
      if (!jobs.includes(job)) jobs.push(job);
    }
  }
  return jobs;
}

/**
 * The train PR number: the open one, or a new one (null in a dry run). A stacked build (`base`: { train, sha, version })
 * writes its base marker into the PR body (an open PR's body is edited when its marker differs).
 */
function ensurePr(n, version, title, members, notes = [], base = null, { strip = false } = {}) {
  const branch = `train/${n}`;
  if (base) {
    const open = openPrInfo(branch);
    if (open) {
      console.log(`train PR: #${open.number}`);
      const want = withBaseMarker(open.body, base);
      if (want !== open.body) act(['gh', 'pr', 'edit', String(open.number), '--body', want]);
      return open.number;
    }
  } else {
    const open = openPrInfo(branch);
    if (open) { // `strip` (a non-stacked build reusing a PR a stacked build opened): drop the stale base marker
      console.log(`train PR: #${open.number}`);
      const want = withBaseMarker(open.body, null);
      if (strip && want !== open.body) act(['gh', 'pr', 'edit', String(open.number), '--body', want]);
      return open.number;
    }
  }
  const url = act(['gh', 'pr', 'create', '--base', 'master', '--head', branch, '--title', trainPrTitle(n, version, title),
    '--body', trainPrBody(n, title, members, notes, base)]);
  return url ? Number(url.split('/').pop()) : null;
}

/**
 * The wire decision: members whose diff against master touches a wire path -> the protocol.ts text with the base's
 * value + 1, else null. The base is origin/master, or a stacked train's base head (`--on`).
 */
function planWire(kept, head, baseRef = 'origin/master') {
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
  const master = protocolValue(protoAt(baseRef));
  const of = baseRef === 'origin/master' ? '' : ` (base ${baseRef.slice(0, 8)})`;
  if (!wire.length) { console.log(`PROTOCOL_VERSION ${master}${of}: unchanged (no member touches the wire)`); return null; }
  const text = bumpProtocol(atHead, master);
  if (text === atHead) { console.log(`PROTOCOL_VERSION already ${master + 1} at the train head (wire: ${wire.join(', ')})`); return null; }
  console.log(`PROTOCOL_VERSION ${master}${of} -> ${master + 1} (wire: ${wire.join(', ')})`);
  return text;
}

/**
 * The `--on <sha>` base of a build, after the fetch: { m, sha (full), version } or { error }. The sha must be another
 * origin/train/<m> head (m < n) with origin/master and train m's version commit in it, and no third train's.
 */
function resolveOnBase(n, on) {
  if (!exists(on)) return { error: `--on ${on}: no such commit (after git fetch origin)` };
  const sha = rev(on);
  const trains = run(['git', 'for-each-ref', '--format=%(refname:short) %(objectname)', 'refs/remotes/origin/train/'])
    .split('\n').filter(Boolean).map((l) => {
      const [ref, s] = l.split(' ');
      const m = /^origin\/train\/(\d+)$/.exec(ref);
      return m ? { n: Number(m[1]), sha: s } : null;
    }).filter(Boolean);
  const r = onBaseCheck({ n, sha, trains, masterInBase: isAncestor('origin/master', sha), baseInMaster: isAncestor(sha, 'origin/master'),
    subjects: firstParentSubjects(sha) });
  return r.error ? r : { ...r, sha };
}

async function build({ n, version, title, branches, keep, on = null }) {
  requireClean();
  // master, every train head (--keep reads train/<n>, --on checks the base against all origin/train/*) and the members
  // (one missing on origin is left out below, as before); narrow + lock-race retry (fetch-retry.mjs)
  fetchOrigin(exec, ['master', 'train/*'], branches);
  const branch = `train/${n}`;
  const race = versionRace(version, versionAt('origin/master'));
  if (race) { console.error(race); return 1; }
  let base = null; // a stacked build (--on): { m, sha, version } of the base train head
  if (on) {
    const r = resolveOnBase(n, on);
    if (r.error) { console.error(`STOP: ${r.error}`); return 1; }
    base = r;
    const above = versionRace(version, base.version);
    if (above) { console.error(`${above.replace("master's package.json", `train ${base.m}'s version`)}`); return 1; }
    console.log(`--on: stacked on train/${base.m} at ${base.sha.slice(0, 8)} (${base.version}); released only after train ${base.m} merges`);
  }
  let head;
  if (keep) {
    if (!exists(`origin/${branch}`)) throw new Error(`--keep: origin/${branch} does not exist`);
    head = rev(`origin/${branch}`);
    const vc = findTrainVersionCommit(firstParentSubjects(head), n);
    if (vc.idx >= 0) {
      const versionSha = rev(`${head}~${vc.idx}`);
      const merged = run(['git', 'log', '--first-parent', '--merges', '--reverse', '--format=%s', `origin/master..${head}`]).split('\n');
      const members = [...new Set([...membersFromLog(merged, n), ...branches])];
      console.error(keepStopMessage({ n, version: vc.version, title, versionSha, pre: rev(`${versionSha}^`), members, after: vc.idx, on: base?.sha }));
      return 1;
    }
    console.log(`--keep: starting from origin/${branch} (${head.slice(0, 8)}), not ${base ? `train/${base.m}` : 'origin/master'}`);
    if (base && !isAncestor(base.sha, head)) { console.error(`STOP: --keep --on: the base ${base.sha.slice(0, 8)} is not in origin/${branch}`); return 1; }
    if (!isAncestor('origin/master', head)) console.warn('WARNING: origin/master is not in that head; release will STOP (exit 3) until the train is rebuilt');
  } else head = base ? base.sha : rev('origin/master');
  const included = [], kept = [], left = [];
  let lintBefore = docLintSafe(head);
  for (const b of branches) {
    console.log(`merging origin/${b}`);
    if (!exists(`origin/${b}`)) { left.push({ b, why: 'no such branch on origin' }); continue; }
    if (base && isAncestor(`origin/${b}`, base.sha)) { console.log(`  already in the base train/${base.m}: not a member of train ${n}`); continue; }
    if (isAncestor(`origin/${b}`, head)) { console.log('  already in (nothing to merge)'); kept.push(b); continue; }
    const m = mergeObjects(head, rev(`origin/${b}`), `Merge origin/${b} into train/${n}`);
    if (m.blocking) { left.push({ b, why: `conflicts in ${m.blocking.join(', ')}` }); console.log(`  LEFT OUT: ${m.blocking.join(', ')}`); continue; }
    const lintAfter = lintBefore ? docLintSafe(m.sha) : null;
    const added = lintAfter ? newLintErrors(lintBefore, lintAfter) : [];
    if (added.length) { const why = lintWhy(added); left.push({ b, why }); console.log(`  LEFT OUT: ${why}`); continue; }
    lintBefore = lintAfter; // null once a lint could not run: later members go unchecked, never judged on a stale base
    head = m.sha; included.push(b); kept.push(b);
  }
  // feature/menu alone is never a train: nothing is pushed and no PR is opened (exit 3, as with no member)
  if (!hasTrainMember(included) && !keep) {
    console.log(`\ntrain/${n} head: ${head}${DRY ? ' (dry run: an unreferenced commit)' : ''}`);
    console.log(`members: (none)${included.length ? ` - only ${included.join(', ')}, not a train` : ''}`);
    for (const l of left) console.log(`LEFT OUT: ${l.b} - ${l.why}`);
    return 3;
  }
  // Audit 2026-10-24 finding 9: everything below is validated on git objects before the one push; the train PR opens
  // only after it. Read only until the push: members, fragments, wire, the open PR (or the number a new one will get).
  const members = trainMembers(head, n);
  const synth = planFragments(members);
  const archive = jobsDone(members);
  const protocol = planWire(wireCandidates(kept, members), head, base ? base.sha : 'origin/master');
  const baseVersion = base ? base.version : versionAt('origin/master');
  const memberPrs = members.filter((m) => m.pr).map((m) => m.pr);
  const merged = [...new Set([...kept, ...members.map((m) => m.branch)])];
  const open = openPrInfo(branch);
  const predicted = open ? open.number : predictPrNumber();
  const make = (pr) => versionTreeCommit({
    head, frags: synth.frags, protocol, subject: (ver) => versionSubject(n, ver), archive, archiveDate: today(),
    release: (assembled) => deriveRelease({ version, title, baseVersion, planned: branches, merged, assembled }),
    opts: (ver, t) => ({ version: ver, title: `Train ${n}: ${t}`, date: today(), pr: pr ?? 'NEW', members: memberPrs }),
  });
  let v;
  try { v = make(predicted); } catch (e) {
    console.error(`STOP: the version commit does not validate, nothing pushed, no PR opened: ${e.message}`);
    for (const l of left) console.log(`LEFT OUT: ${l.b} - ${l.why}`);
    return 1;
  }
  const rel = deriveRelease({ version, title, baseVersion, planned: branches, merged, assembled: v.assembled });
  for (const note of rel.notes) console.log(note);
  const race2 = versionRace(v.version, versionAt('origin/master')) ?? (base ? versionRace(v.version, base.version) : null);
  if (race2) { console.error(race2); return 1; }
  console.log(summary(v.assembled, `CHANGELOG.md: ${releaseHeading(v.version, `Train ${n}: ${v.title}`, today(), predicted ?? 'NEW', memberPrs)}`));
  if (protocol) console.log('src/net/protocol.ts goes into the version commit');
  for (const a of v.archived) console.log(`archive (Job-done: ${a.job}): ${a.from}/ -> ${a.to}/ in the version commit (${a.files} files; links fixed in ${a.rewritten.length} other docs)`);
  // One push: the version commit (CI and the laptop start on it); no pre-version push for CI to cancel.
  act(['git', 'push', ...(keep ? [] : ['--force']), 'origin', `${v.sha}:refs/heads/${branch}`]);
  clearBuildMarker();
  const pr = ensurePr(n, v.version, v.title, members, synth.notes, base && { train: base.m, sha: base.sha, version: base.version }, { strip: !base });
  if (!DRY && open && open.title !== trainPrTitle(n, v.version, v.title)) { // a reused PR names what this build released
    act(['gh', 'pr', 'edit', String(pr), '--title', trainPrTitle(n, v.version, v.title)]);
  }
  if (!DRY && pr && pr !== predicted) { // another PR or issue took the number: the heading names the real one
    console.warn(`the train PR is #${pr}, not the predicted #${predicted ?? '?'}: rewriting the heading (second push)`);
    const first = v.sha;
    v = make(pr);
    act(['git', 'push', `--force-with-lease=refs/heads/${branch}:${first}`, 'origin', `${v.sha}:refs/heads/${branch}`]);
  }
  if (!DRY) { // the local branch follows (hand --keep fixes start from it); the push above is what counts
    const co = exec(['git', 'checkout', '-B', branch, v.sha]);
    if (co.status !== 0) console.warn(`WARNING: local checkout of ${branch} failed: ${co.err.trim()}`);
  }
  console.log(`\ntrain/${n} head: ${v.sha}${DRY ? ' (dry run: an unreferenced version commit, validated)' : ''}`);
  console.log(`version: ${v.version} (${rel.kind})${v.version !== version ? ` (asked ${version})` : ''}`);
  console.log(`members: ${kept.join(', ') || '(none)'}${pr ? ` | train PR #${pr}` : ''}`);
  for (const l of left) console.log(`LEFT OUT: ${l.b} - ${l.why}`);
  console.log(`\nnext: node scripts/merge-train.mjs release ${n} ${v.version} ${JSON.stringify(v.title)}`);
  return 0;
}

/** The number GitHub gives the next issue / PR (newest + 1); null when unknown (a dry run, gh failed). */
function predictPrNumber() {
  const r = exec(['gh', 'api', 'repos/{owner}/{repo}/issues?state=all&per_page=1&sort=created&direction=desc', '--jq', '.[0].number']);
  const last = Number(r.out.trim());
  return r.status === 0 && Number.isFinite(last) && last > 0 ? last + 1 : null;
}

/**
 * auto-train's build marker (AUTO_TRAIN_BUILD_MARKER, set by the tick): deleted as soon as the version commit is
 * pushed, so the desktop queue claims the train head at once, not when the tick's build call returns. Never throws.
 */
export function clearBuildMarker(env = process.env) {
  const file = env.AUTO_TRAIN_BUILD_MARKER;
  if (!file) return;
  if (DRY) { console.log(`  [dry-run] would delete the build marker ${file}`); return; }
  try { fs.rmSync(file, { force: true }); console.log(`build marker ${file} deleted (version commit pushed)`); } catch { /* the tick's finally deletes it */ }
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
  const members = trainMembers(head, n);
  const pr = ensurePr(n, version, title, members);
  const v = versionCommit({ branch, head, checkout: ['git', 'checkout', '-B', branch, head], version, title: `Train ${n}: ${title}`, pr,
    members: members.filter((m) => m.pr).map((m) => m.pr), subject: versionSubject(n, version) });
  if (v.code) return v.code;
  return ciAndMerge({ branch, sha: v.sha, pr, version, n, members });
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
  // master and the train heads (train/<n>; a stacked train's base is another train head); narrow + lock-race retry
  fetchOrigin(exec, ['master', 'train/*', 'dev']); // dev: the already-merged path's releaseTail (master)
  const branch = `train/${n}`;
  if (!exists(`origin/${branch}`)) throw new Error(`origin/${branch} does not exist (run build first)`);
  const head = rev(`origin/${branch}`);
  const pin = headPinCheck(head, wantHead, branch);
  if (pin) { console.error(pin); return 1; }
  if (isAncestor(head, 'origin/master')) { // died after the merge: only the idempotent tail is left
    console.log(`origin/${branch} ${head.slice(0, 8)} is already in origin/master: running the tail only (tag, dev, member PRs, deploy)`);
    return repairHead({ n, version, head });
  }
  const subjects = firstParentSubjects(head);
  const foreign = foreignVersionStop(subjects, n, branch); // guard (a): never pull an unreleased train into master
  if (foreign) { console.error(foreign); return 4; }
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
  // A train built on master has master in its head; one without it is accepted only as a stacked train (--on) whose
  // base train merged exactly at the recorded base, so GitHub's merge keeps the tested tree (check b).
  const stacked = !isAncestor('origin/master', head);
  if (stacked) {
    const d = stackedDecision({ branch, ...stackedFacts(branch, head) });
    if (!d.ok) { console.error(d.message); return d.code; }
    console.log(d.message);
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
  console.log(`origin/${branch} ${head.slice(0, 8)}: version commit ${idx ? `at ~${idx}` : 'at the head'}, package.json ${at}, ${stacked ? 'stacked (base merged)' : 'master is in'}`);
  const members = trainMembers(head, n);
  const pr = ensurePr(n, version, title, members);
  return ciAndMerge({ branch, sha: head, pr, version, stacked, n, members });
}

/** The git / gh facts of check (b) for a stacked train head (read only); see stackedDecision. */
function stackedFacts(branch, head) {
  const open = openPrInfo(branch);
  const marker = parseBaseMarker(open?.body);
  if (!marker) return { marker: null };
  const known = exists(marker.sha);
  const baseVersion = known ? versionAt(marker.sha) : '?';
  const tagCommit = known ? remoteTagCommit(`v${baseVersion}`) : null;
  const parent2 = tagCommit && exists(tagCommit) ? exec(['git', 'rev-parse', '--verify', '--quiet', `${tagCommit}^2`]) : null;
  return {
    marker,
    baseInHead: known && isAncestor(marker.sha, head),
    baseInMaster: known && isAncestor(marker.sha, 'origin/master'),
    baseVersion, tagCommit,
    tagParent: parent2 && parent2.status === 0 ? parent2.out.trim() : null,
    mergeTree: mergedTree('origin/master', head),
    headTree: treeOf(head),
  };
}

async function single({ branch, version, title }) {
  requireClean();
  fetchOrigin(exec, ['master'], [branch]); // narrow + lock-race retry (fetch-retry.mjs); a missing branch throws below
  if (!exists(`origin/${branch}`)) throw new Error(`origin/${branch} does not exist`);
  const race = versionRace(version, versionAt('origin/master'));
  if (race) { console.error(race); return 1; }
  const pr = openPr(branch);
  if (!pr) throw new Error(`no open PR has head ${branch}`);
  const foreign = foreignVersionStop(firstParentSubjects(`origin/${branch}`), null, branch); // guard (a)
  if (foreign) { console.error(foreign); return 4; }
  const head = mergeMaster(rev(`origin/${branch}`), branch);
  if (!head) return 3;
  console.log(`PR #${pr} (${branch})`);
  const v = versionCommit({ branch, head, checkout: ['git', 'checkout', '--detach', head], version, title, pr, members: [],
    subject: `${version}: version at merge (G183)`, archive: jobsDone([{ pr, branch }]) });
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
  const cmds = { build, release, single, repair };
  const go = () => cmds[args.cmd](args);
  const after = async (code) => { for (const f of AFTER_LOCK.splice(0)) await f(); return code; };
  if (DRY) return go(); // a dry run moves no ref: no train lock
  const lock = trainLockPath();
  let cur = null;
  try { cur = fs.readFileSync(lock, 'utf8'); } catch { /* absent */ }
  if (heldByParent(cur, process.env.AUTO_TRAIN_LOCK_TEXT)) return after(await go()); // the caller's lock: the wait runs inside it
  const t = takeTouchLock(lock, `merge-train ${args.cmd}`, { staleMin: TRAIN_LOCK_STALE_MIN });
  if (!t.release) {
    console.error(`STOP: the train lock ${lock} is held ("${t.holder}", touched ${Math.round(t.ageMin)} min ago): an auto-train tick or another merge-train is running; retry later`);
    return 1;
  }
  let code;
  try { code = await go(); } finally { t.release(); }
  return after(code); // the deploy wait runs after the train lock is released
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (e) => { console.error(`merge-train: ${e.message}`); process.exit(1); });
}
