// Visual gate baseline store, I/O part (docs/visual-gate/PLAN.md section 5): reads and writes the `visual-baselines`
// data branch with git plumbing only (temp index, no checkout; the scripts/laptop-queue/request.mjs pattern), never
// touching the working tree, the worktree index or HEAD. Every function takes `{ cwd, remote }` so tests can point it at
// a temp repo. Pure shapes and the baseline pick: storeLib.mjs.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BRANCH, acceptPath, runPaths, validateRun } from './storeLib.mjs';

/** @typedef {import('./storeLib.mjs').Records} Records */
/** @typedef {import('./storeLib.mjs').RunRecord} RunRecord */
/** @typedef {import('./storeLib.mjs').AcceptRecord} AcceptRecord */
/** @typedef {{ cwd?: string, remote?: string }} StoreOpts */

/**
 * @param {string[]} args
 * @param {{ cwd: string, env?: Record<string, string>, input?: string | Buffer, soft?: boolean }} o
 */
function git(args, { cwd, env = {}, input, soft = false }) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, ...env }, input, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, timeout: 120_000 }).trim();
  } catch (e) {
    if (soft) return '';
    throw e;
  }
}

/** @param {string} remote */
const trackingRef = (remote) => `refs/remotes/${remote}/${BRANCH}`;

/** Fetch the data branch into refs/remotes/<remote>/visual-baselines (soft: a missing branch is fine). @param {StoreOpts} [o] */
export function fetchStore({ cwd = process.cwd(), remote = 'origin' } = {}) {
  git(['fetch', '-q', remote, `+refs/heads/${BRANCH}:${trackingRef(remote)}`], { cwd, soft: true });
}

/**
 * Every `runs/<sha>/result.json` and `accepted/*.json` on the fetched data branch; empty Records when the ref is absent.
 * Reads all blobs in one `git cat-file --batch` (not one `git show` each); an unparseable file is skipped with a warning.
 * @param {StoreOpts} [o] @returns {Records}
 */
export function readRecords({ cwd = process.cwd(), remote = 'origin' } = {}) {
  /** @type {Records} */
  const out = { runs: [], accepted: [] };
  const ref = trackingRef(remote);
  if (!git(['rev-parse', '--verify', '-q', `${ref}^{commit}`], { cwd, soft: true })) return out;
  const paths = git(['ls-tree', '-r', '--name-only', ref], { cwd }).split('\n').map((p) => p.trim())
    .filter((p) => /^runs\/[^/]+\/result\.json$/.test(p) || /^accepted\/[^/]+\.json$/.test(p));
  if (!paths.length) return out;
  const buf = execFileSync('git', ['cat-file', '--batch'], { cwd, input: paths.map((p) => `${ref}:${p}\n`).join(''), stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, timeout: 120_000, maxBuffer: 1 << 30 });
  let off = 0;
  for (const p of paths) {
    const nl = buf.indexOf(10, off);
    const header = buf.subarray(off, nl).toString('utf8');
    const m = /^\S+ blob (\d+)$/.exec(header);
    if (!m) throw new Error(`git cat-file: unexpected header for ${p}: ${header}`);
    const size = Number(m[1]);
    const text = buf.subarray(nl + 1, nl + 1 + size).toString('utf8');
    off = nl + 1 + size + 1;
    let rec;
    try { rec = JSON.parse(text); } catch { console.warn(`visual-baselines: skipped unparseable ${p}`); continue; }
    if (p.startsWith('runs/')) out.runs.push(rec); else out.accepted.push(rec);
  }
  return out;
}

/**
 * Commit `files` on top of the fetched data branch (or orphan the first time) with a temp index, then push it to
 * `<remote> visual-baselines` (5 tries, refetch and rebuild between). `dryRun` builds the commit and pushes nothing.
 * @param {{ path: string, data: string | Uint8Array }[]} files
 * @param {string} message
 * @param {StoreOpts & { dryRun?: boolean }} [o]
 * @returns {string} the commit sha
 */
export function writeFiles(files, message, { dryRun = false, ...opts } = {}) {
  const { cwd = process.cwd(), remote = 'origin' } = opts;
  const tmpIndex = path.join(os.tmpdir(), `vg-index-${process.pid}-${randomBytes(4).toString('hex')}`);
  /** @type {Record<string, string>} */
  const idEnv = git(['config', 'user.email'], { cwd, soft: true }) ? {} : { GIT_AUTHOR_NAME: 'visual-gate', GIT_AUTHOR_EMAIL: 'visual-gate@localhost', GIT_COMMITTER_NAME: 'visual-gate', GIT_COMMITTER_EMAIL: 'visual-gate@localhost' };
  const env = { GIT_INDEX_FILE: tmpIndex, ...idEnv };
  const buildCommit = () => {
    const parent = git(['rev-parse', '--verify', '-q', `${trackingRef(remote)}^{commit}`], { cwd, soft: true });
    fs.rmSync(tmpIndex, { force: true });
    if (parent) git(['read-tree', parent], { cwd, env }); else git(['read-tree', '--empty'], { cwd, env });
    const infos = [];
    for (const f of files) {
      const input = typeof f.data === 'string' ? f.data : Buffer.from(f.data.buffer, f.data.byteOffset, f.data.byteLength);
      const blob = git(['hash-object', '-w', '--stdin'], { cwd, input });
      infos.push('--cacheinfo', `100644,${blob},${f.path}`);
    }
    git(['update-index', '--add', ...infos], { cwd, env });
    const tree = git(['write-tree'], { cwd, env });
    return git(['commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m', message], { cwd, env });
  };
  try {
    let commit = '';
    for (let attempt = 1; attempt <= 5; attempt++) {
      commit = buildCommit();
      if (dryRun) {
        console.info(`dry-run: would push ${commit} to ${remote} ${BRANCH}`);
        for (const f of files) console.info(`  ${f.path}`);
        return commit;
      }
      try {
        git(['push', '-q', remote, `${commit}:refs/heads/${BRANCH}`], { cwd });
        fetchStore({ cwd, remote });
        return commit;
      } catch (e) {
        const err = /** @type {{ stderr?: unknown, message?: string }} */ (e);
        if (attempt === 5) throw new Error(`push failed after 5 tries: ${String(err.stderr ?? err.message).split('\n')[0]}`);
        fetchStore({ cwd, remote });
      }
    }
    return commit;
  } finally {
    fs.rmSync(tmpIndex, { force: true });
  }
}

/**
 * `(sha) => sha is an ancestor of refs/remotes/<remote>/master` (exit 0 true, 1 false, other throws). A sha whose commit
 * is not in the local object store cannot be an ancestor of the local master ref, so it is false (a recorded PR or
 * failed-train run whose branch was never fetched), not an error.
 * @param {StoreOpts} [o] @returns {(sha: string) => boolean}
 */
export function isAncestorFn({ cwd = process.cwd(), remote = 'origin' } = {}) {
  const master = `refs/remotes/${remote}/master`;
  return (sha) => {
    if (!git(['cat-file', '-t', sha], { cwd, soft: true }).startsWith('commit')) return false;
    try {
      execFileSync('git', ['merge-base', '--is-ancestor', sha, master], { cwd, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, timeout: 120_000 });
      return true;
    } catch (e) {
      if (/** @type {{ status?: number }} */ (e).status === 1) return false;
      throw e;
    }
  };
}

/**
 * Validate and write a run (`runs/<sha>/result.json` plus thumbs). Throws on a bad record.
 * @param {RunRecord} rec @param {Record<string, Uint8Array>} [thumbs] @param {StoreOpts & { dryRun?: boolean }} [opts]
 */
export function recordRun(rec, thumbs = {}, opts = {}) {
  const problems = validateRun(rec);
  if (problems.length) throw new Error(`bad run record: ${problems.join('; ')}`);
  return writeFiles(runPaths(rec, thumbs), `visual-gate run ${rec.sha.slice(0, 8)} ${rec.version}`, opts);
}

/** Write an accept record to `accepted/<version>-<sha8>.json`. @param {AcceptRecord} a @param {StoreOpts & { dryRun?: boolean }} [opts] */
export function recordAccept(a, opts = {}) {
  return writeFiles([{ path: acceptPath(a), data: `${JSON.stringify(a, null, 2)}\n` }], `visual-gate accept ${a.version} by ${a.by}`, opts);
}
