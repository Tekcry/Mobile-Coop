// visual-gate VG7 results pusher (docs/visual-gate/briefs/VG7.md, BRIEF A26): commits a scratch folder onto a
// `shots/visual-gate-*` branch with git plumbing only (a temp index in os.tmpdir(), no checkout; the store.mjs
// `writeFiles` pattern, copied, not imported), so a laptop request's last step can bring its result.json files back.
// HEAD, the index and the working tree of `cwd` are never touched. Refuses any other branch.
//   node scripts/visual-gate/push-results.mjs --dir <folder> --branch shots/visual-gate-<name> --prefix <p> [--message <text>] [--dry-run]
// Exit 0 ok, 1 error, 2 usage. Runs under cmd.exe on the laptop: plain arguments only.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const USAGE = 'usage: node scripts/visual-gate/push-results.mjs --dir <folder> --branch shots/visual-gate-<name> --prefix <p> [--message <text>] [--dry-run]';
const BRANCH_RE = /^shots\/visual-gate-[a-z0-9.-]+$/;
const MB = 1024 * 1024;
export const MAX_FILE_BYTES = 50 * MB;
export const MAX_TOTAL_BYTES = 150 * MB;
/** update-index arguments per call (keeps a Windows command line far under its 32k limit). */
const CACHEINFO_BATCH = 100;

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

/**
 * Every regular file under `dir`, recursive, as `{ rel, abs, size }` with `/` separators, sorted by rel. Symbolic links
 * are not followed.
 * @param {string} dir
 * @returns {{ rel: string, abs: string, size: number }[]}
 */
export function listFiles(dir) {
  /** @type {{ rel: string, abs: string, size: number }[]} */
  const out = [];
  /** @param {string} abs @param {string} rel */
  const walk = (abs, rel) => {
    for (const ent of fs.readdirSync(abs, { withFileTypes: true })) {
      const a = path.join(abs, ent.name);
      const r = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) walk(a, r);
      else if (ent.isFile()) out.push({ rel: r, abs: a, size: fs.statSync(a).size });
    }
  };
  walk(dir, '');
  return out.sort((x, y) => (x.rel < y.rel ? -1 : x.rel > y.rel ? 1 : 0));
}

/**
 * Commit every file under `dir` to `<prefix>/<relative path>` on top of the fetched `branch` (or orphan the first time;
 * files already there stay, the same paths are replaced) and push it (5 tries, refetch and rebuild between). `dryRun`
 * builds the commit, prints it and the paths, and pushes nothing.
 * @param {{ dir: string, branch: string, prefix: string, message?: string, dryRun?: boolean, cwd?: string, remote?: string }} o
 * @returns {{ commit: string, files: number, bytes: number }}
 */
export function pushFolder({ dir, branch, prefix, message, dryRun = false, cwd = process.cwd(), remote = 'origin' }) {
  if (typeof branch !== 'string' || !BRANCH_RE.test(branch) || branch.includes('..')) throw new Error(`refused branch ${String(branch)}: only shots/visual-gate-<name> ([a-z0-9.-])`);
  const p = String(prefix ?? '').replace(/\/+$/, '');
  if (!p || p.startsWith('/') || p.includes('..') || p.includes('\\') || /^[a-zA-Z]:/.test(p) || p.split('/').some((s) => s === '' || s === '.')) throw new Error(`refused prefix ${String(prefix)}: a relative path without ..`);
  if (!dir || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw new Error(`no such folder ${String(dir)}`);
  const list = listFiles(dir);
  if (!list.length) throw new Error(`empty folder ${dir}`);
  let bytes = 0;
  for (const f of list) {
    if (f.size > MAX_FILE_BYTES) throw new Error(`${f.rel} is ${(f.size / MB).toFixed(1)} MB (max ${MAX_FILE_BYTES / MB} MB per file)`);
    bytes += f.size;
  }
  if (bytes > MAX_TOTAL_BYTES) throw new Error(`folder is ${(bytes / MB).toFixed(1)} MB (max ${MAX_TOTAL_BYTES / MB} MB)`);
  const msg = message || `visual-gate results ${p} (${list.length} files)`;
  const tracking = `refs/remotes/${remote}/${branch}`;
  const fetch = () => git(['fetch', '-q', remote, `+refs/heads/${branch}:${tracking}`], { cwd, soft: true });
  const tmpIndex = path.join(os.tmpdir(), `vg-results-index-${process.pid}-${randomBytes(4).toString('hex')}`);
  const anon = !git(['config', 'user.name'], { cwd, soft: true }) || !git(['config', 'user.email'], { cwd, soft: true });
  /** @type {Record<string, string>} */
  const idEnv = anon ? { GIT_AUTHOR_NAME: 'visual-gate (laptop)', GIT_AUTHOR_EMAIL: 'visual-gate@localhost', GIT_COMMITTER_NAME: 'visual-gate (laptop)', GIT_COMMITTER_EMAIL: 'visual-gate@localhost' } : {};
  const env = { GIT_INDEX_FILE: tmpIndex, ...idEnv };
  const buildCommit = () => {
    const parent = git(['rev-parse', '--verify', '-q', `${tracking}^{commit}`], { cwd, soft: true });
    fs.rmSync(tmpIndex, { force: true });
    if (parent) git(['read-tree', parent], { cwd, env }); else git(['read-tree', '--empty'], { cwd, env });
    /** @type {string[]} */
    let infos = [];
    const flush = () => {
      if (infos.length) git(['update-index', '--add', ...infos], { cwd, env });
      infos = [];
    };
    for (const f of list) {
      const blob = git(['hash-object', '-w', '--stdin'], { cwd, input: fs.readFileSync(f.abs) });
      infos.push('--cacheinfo', `100644,${blob},${p}/${f.rel}`);
      if (infos.length >= CACHEINFO_BATCH * 2) flush();
    }
    flush();
    const tree = git(['write-tree'], { cwd, env });
    return git(['commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m', msg], { cwd, env });
  };
  try {
    fetch();
    let commit = '';
    for (let attempt = 1; attempt <= 5; attempt++) {
      commit = buildCommit();
      if (dryRun) {
        console.info(`dry-run: would push ${commit} to ${remote} ${branch}`);
        for (const f of list) console.info(`  ${p}/${f.rel}`);
        return { commit, files: list.length, bytes };
      }
      try {
        git(['push', '-q', remote, `${commit}:refs/heads/${branch}`], { cwd });
        fetch();
        return { commit, files: list.length, bytes };
      } catch (e) {
        const err = /** @type {{ stderr?: unknown, message?: string }} */ (e);
        if (attempt === 5) throw new Error(`push failed after 5 tries: ${String(err.stderr ?? err.message).split('\n')[0]}`);
        fetch();
      }
    }
    return { commit, files: list.length, bytes };
  } finally {
    fs.rmSync(tmpIndex, { force: true });
  }
}

/**
 * @param {string[]} argv
 * @returns {{ dir?: string, branch?: string, prefix?: string, message?: string, dryRun: boolean, error: string | null }}
 */
export function parseArgs(argv) {
  /** @type {{ dir?: string, branch?: string, prefix?: string, message?: string, dryRun: boolean, error: string | null }} */
  const o = { dryRun: false, error: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') { o.dryRun = true; continue; }
    if (a === '--dir' || a === '--branch' || a === '--prefix' || a === '--message') {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) return { ...o, error: `${a} needs a value` };
      o[/** @type {'dir' | 'branch' | 'prefix' | 'message'} */ (a.slice(2))] = v;
      i++;
      continue;
    }
    return { ...o, error: `unknown argument ${a}` };
  }
  if (!o.dir || !o.branch || !o.prefix) return { ...o, error: '--dir, --branch and --prefix are required' };
  return o;
}

/** @param {string[]} [argv] @param {{ cwd?: string, remote?: string }} [opts] @returns {number} the exit code */
export function main(argv = process.argv.slice(2), opts = {}) {
  const a = parseArgs(argv);
  if (a.error) {
    console.error(`push-results: ${a.error}\n${USAGE}`);
    return 2;
  }
  try {
    const r = pushFolder({ dir: /** @type {string} */ (a.dir), branch: /** @type {string} */ (a.branch), prefix: /** @type {string} */ (a.prefix), message: a.message, dryRun: a.dryRun, ...opts });
    const prefix = String(a.prefix).replace(/\/+$/, '');
    const mb = (r.bytes / MB).toFixed(2);
    if (a.dryRun) console.info(`dry-run: ${r.files} files (${mb} MB) for ${a.branch} ${r.commit.slice(0, 8)} under ${prefix}/, nothing pushed`);
    else console.info(`pushed ${r.files} files (${mb} MB) to ${a.branch} ${r.commit.slice(0, 8)} under ${prefix}/`);
    return 0;
  } catch (e) {
    console.error(`push-results: ${/** @type {Error} */ (e).message ?? String(e)}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) process.exitCode = main();
