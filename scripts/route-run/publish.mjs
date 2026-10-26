// Route-run results branch (J13 R4a, BRIEF A9): `--publish` commits one run log to the branch `route-run-results` at
// `<map>/<sha8>-<time>/` with git plumbing only (a temp index, no checkout: never the working tree, the worktree index or
// HEAD), as scripts/laptop-queue/request.mjs does, retrying on a lost push race. `--merge` reads them back.
//   publishLog({ map, sha, time, files: { name: text } }) -> { dir, commit }
//   readParts(map, sha) -> [{ dir, log }]   the published logs of one map and commit (desktop: fetches the branch)
// Pure helpers (tests/routeRunCli.test.ts): `partDir`, `pickParts`.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const BRANCH = 'route-run-results';
/** The run log's file name in a part's folder (the CLI also writes REPORT.md beside it). */
export const LOG_FILE = 'route-run-log.json';
const PUSH_TRIES = 5;

/** `<map>/<sha8>-<time>/`: the time is the run's ISO date with only digits and T kept (sorts, no ':' in a path). */
export function partDir(map, sha, date) {
  const stamp = String(date).replace(/\.\d+Z$/, 'Z').replace(/[^0-9TZ]/g, '');
  return `${map}/${String(sha).slice(0, 8)}-${stamp}/`;
}

/** The part folders of `map` for commit `sha` among the branch's file paths, oldest first: [dir]. */
export function pickParts(paths, map, sha) {
  const head = `${map}/${String(sha).slice(0, 8)}-`;
  const dirs = new Set();
  for (const p of paths) {
    if (!p.startsWith(head) || !p.endsWith(`/${LOG_FILE}`)) continue;
    dirs.add(p.slice(0, p.length - LOG_FILE.length));
  }
  return [...dirs].sort();
}

const git = (args, { env = {}, input, soft = false } = {}) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', env: { ...process.env, ...env }, input, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, timeout: 120_000, maxBuffer: 64 * 1024 * 1024 }).trim();
  } catch (e) {
    if (soft) return '';
    throw e;
  }
};
const fetchBranch = () => git(['fetch', '-q', 'origin', `+refs/heads/${BRANCH}:refs/remotes/origin/${BRANCH}`], { soft: true });

/** Commit `files` (name -> text) under the part's folder on top of origin/route-run-results (or orphan) and push. */
export function publishLog({ map, sha, date, files }) {
  const dir = partDir(map, sha, date);
  const tmpIndex = path.join(os.tmpdir(), `rr-index-${process.pid}`);
  const idEnv = git(['config', 'user.email'], { soft: true }) ? {} : { GIT_AUTHOR_NAME: 'route-run', GIT_AUTHOR_EMAIL: 'route-run@localhost', GIT_COMMITTER_NAME: 'route-run', GIT_COMMITTER_EMAIL: 'route-run@localhost' };
  const build = () => {
    const parent = git(['rev-parse', '--verify', '-q', `refs/remotes/origin/${BRANCH}`], { soft: true });
    const env = { GIT_INDEX_FILE: tmpIndex, ...idEnv };
    fs.rmSync(tmpIndex, { force: true });
    if (parent) git(['read-tree', parent], { env });
    else git(['read-tree', '--empty'], { env });
    for (const [name, text] of Object.entries(files)) {
      const blob = git(['hash-object', '-w', '--stdin'], { input: text });
      git(['update-index', '--add', '--cacheinfo', `100644,${blob},${dir}${name}`], { env });
    }
    const tree = git(['write-tree'], { env });
    return git(['commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m', `route-run ${dir}`], { env });
  };
  fetchBranch();
  try {
    for (let attempt = 1; ; attempt++) {
      const commit = build();
      try {
        git(['push', '-q', 'origin', `${commit}:refs/heads/${BRANCH}`]);
        fetchBranch();
        return { dir, commit };
      } catch (e) {
        if (attempt >= PUSH_TRIES) throw new Error(`route-run --publish: push failed after ${PUSH_TRIES} tries: ${String(e.stderr ?? e.message).split('\n')[0]}`);
        // a lost race: someone pushed first; rebuild on the new tip
        fetchBranch();
      }
    }
  } finally {
    fs.rmSync(tmpIndex, { force: true });
  }
}

/** The published run logs of `map` at `sha` (oldest first), read from origin/route-run-results after a fetch. */
export function readParts(map, sha) {
  fetchBranch();
  const ref = `refs/remotes/origin/${BRANCH}`;
  if (!git(['rev-parse', '--verify', '-q', ref], { soft: true })) throw new Error(`route-run --merge: no ${BRANCH} branch on origin`);
  const paths = git(['ls-tree', '-r', '--name-only', ref, `${map}/`]).split('\n').filter(Boolean);
  return pickParts(paths, map, sha).map((dir) => ({ dir, log: JSON.parse(git(['show', `${ref}:${dir}${LOG_FILE}`])) }));
}
