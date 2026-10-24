// Laptop queue request CLI (docs/laptop-queue/PLAN.md): adds requests/<id>.json to the laptop-queue branch with git
// plumbing only (temp index, no checkout), never touching the working tree, the worktree index or HEAD. Prints the id.
//   node scripts/laptop-queue/request.mjs --sha <ref> [--pr N] [--set name] [--jobs N] [--requester "<title>"]
//     (--suites "a b c" | --affected [--wide] | --full | --alone --step "<cmd>" [--step ...] [--env K=V ...]) [--note ".."] [--branch x] [--dry-run]
// --affected [--wide]: the suites come from scripts/e2e-affected.mjs (DIRECT tier, --wide the cross-area set) for the
// committed diff from the merge-base with origin/master to --sha; a diff that reaches no browser suite is refused.
// --train-rerun (with --pr N and --suites; auto-train, --requester auto-train): a train's failed suites rerun on the
// laptop at train priority; "trainRerun": true, kind pr. Context laptop-e2e/<set> (no --set: laptop-e2e/rerun-<suites>).
// A pass also posts laptop-e2e success on the sha.
// --pin: "pin": true, never superseded (A/B and baseline runs kept on purpose; queue-audit skips them too).
// --dry-run: builds the commit but pushes nothing; prints the sha it would push and the JSON.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { requestId, requestProblem } from './lib.mjs';
import { selectSuites, DIRECT_COVERS, WIDE_COVERS } from '../e2e-affected.mjs';

const argv = process.argv.slice(2);
const opts = { step: [], env: [] };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) { console.error(`unexpected argument ${a}`); process.exit(1); }
  const k = a.slice(2);
  if (['full', 'alone', 'dry-run', 'train-rerun', 'pin', 'affected', 'wide'].includes(k)) opts[k] = true;
  else if (k === 'step' || k === 'env') opts[k].push(argv[++i]);
  else opts[k] = argv[++i];
}

const git = (args, { env = {}, input, soft = false } = {}) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', env: { ...process.env, ...env }, input, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, timeout: 120_000 }).trim();
  } catch (e) {
    if (soft) return '';
    throw e;
  }
};

if (!opts.sha) { console.error('usage: request.mjs --sha <ref> (--suites "a b" | --affected [--wide] | --full | --alone --step "<cmd>") [--pr N] [--set s] [--jobs N] [--requester t] [--note t] [--pin] [--dry-run]'); process.exit(1); }

if (opts.affected && (opts.suites || opts.full || opts.alone || opts['train-rerun'])) { console.error('--affected replaces --suites (no --full / --alone / --train-rerun)'); process.exit(1); }
if (opts.wide && !opts.affected) { console.error('--wide needs --affected'); process.exit(1); }

if (opts['train-rerun'] && (!opts.pr || !opts.suites || opts.full || opts.alone)) { console.error('--train-rerun needs --pr N and --suites (no --full / --alone)'); process.exit(1); }

git(['fetch', '-q', 'origin'], { soft: true });
const isRef = !/^[0-9a-f]{7,40}$/i.test(opts.sha) && opts.sha !== 'HEAD';
const resolve = (ref) => git(['rev-parse', '--verify', '-q', `${ref}^{commit}`], { soft: true });
// a branch name resolves to the just-fetched origin/<name> first (a stale local branch must not win)
const sha = (isRef && !opts.sha.startsWith('origin/') ? resolve(`origin/${opts.sha}`) : '') || resolve(opts.sha);
if (!sha) { console.error(`cannot resolve ${opts.sha}`); process.exit(1); }

/** --affected: the suites for the committed diff from the merge-base with origin/master to sha. */
function affectedSuites() {
  const mb = git(['merge-base', 'origin/master', sha], { soft: true });
  if (!mb) { console.error(`--affected: no merge-base between origin/master and ${sha}`); process.exit(1); }
  const files = git(['diff', '--name-only', '--no-renames', mb, sha]).split('\n').map((f) => f.trim()).filter(Boolean);
  const suites = selectSuites(files, opts.wide ? WIDE_COVERS : DIRECT_COVERS);
  console.error(`affected${opts.wide ? ' (wide)' : ''}: ${files.length} changed file(s), ${suites.length} suite(s): ${suites.join(' ') || '-'}`);
  if (!suites.length) { console.error('--affected: no browser suite reached (docs / unit tests only): nothing to request'); process.exit(1); }
  return suites;
}

const branch = opts.branch ?? (isRef ? opts.sha.replace(/^origin\//, '') : opts.sha === 'HEAD' ? git(['rev-parse', '--abbrev-ref', 'HEAD'], { soft: true }) : '');
const requester = opts.requester ?? 'unknown';
// 4 random hex so two requests in the same second never collide
const id = `${requestId(Date.now(), requester, sha)}-${randomBytes(2).toString('hex')}`;
const kind = opts.alone ? 'alone' : opts.full ? 'full' : 'pr';
const req = { id, sha, branch, pr: opts.pr ? Number(opts.pr) : null, kind, requester };
if (kind === 'pr') req.suites = opts.affected ? affectedSuites() : String(opts.suites ?? '').split(/\s+/).filter(Boolean);
if (opts['train-rerun']) req.trainRerun = true;
if (kind === 'alone') {
  req.steps = opts.step;
  req.env = Object.fromEntries(opts.env.map((e) => { const i = e.indexOf('='); return [e.slice(0, i), e.slice(i + 1)]; }));
}
if (opts.jobs) req.jobs = Number(opts.jobs);
if (opts.set) req.set = opts.set;
if (opts.note) req.note = opts.note;
if (opts.pin) req.pin = true;
const problem = requestProblem(req);
if (problem) { console.error(`bad request: ${problem}`); process.exit(1); }
const json = `${JSON.stringify(req, null, 2)}\n`;

const tmpIndex = path.join(os.tmpdir(), `lq-index-${process.pid}`);
const idEnv = git(['config', 'user.email'], { soft: true }) ? {} : { GIT_AUTHOR_NAME: 'laptop-queue', GIT_AUTHOR_EMAIL: 'laptop-queue@localhost', GIT_COMMITTER_NAME: 'laptop-queue', GIT_COMMITTER_EMAIL: 'laptop-queue@localhost' };

/** Commit on top of the current origin/laptop-queue (or orphan the first time), index in a temp file. */
function buildCommit() {
  const parent = git(['rev-parse', '--verify', '-q', 'refs/remotes/origin/laptop-queue'], { soft: true });
  const env = { GIT_INDEX_FILE: tmpIndex, ...idEnv };
  fs.rmSync(tmpIndex, { force: true });
  if (parent) git(['read-tree', parent], { env }); else git(['read-tree', '--empty'], { env });
  const blob = git(['hash-object', '-w', '--stdin'], { input: json });
  git(['update-index', '--add', '--cacheinfo', `100644,${blob},requests/${id}.json`], { env });
  const tree = git(['write-tree'], { env });
  return git(['commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m', `request ${id}`], { env });
}

try {
  let commit = '';
  for (let attempt = 1; attempt <= 5; attempt++) {
    commit = buildCommit();
    if (opts['dry-run']) { console.info(`dry-run: would push ${commit} to origin laptop-queue\n${json}`); break; }
    try {
      git(['push', '-q', 'origin', `${commit}:refs/heads/laptop-queue`]);
      git(['fetch', '-q', 'origin', '+refs/heads/laptop-queue:refs/remotes/origin/laptop-queue'], { soft: true });
      break;
    } catch (e) {
      if (attempt === 5) { console.error(`push failed after 5 tries: ${String(e.stderr ?? e.message).split('\n')[0]}`); process.exit(1); }
      git(['fetch', '-q', 'origin', '+refs/heads/laptop-queue:refs/remotes/origin/laptop-queue'], { soft: true });
    }
  }
  console.info(id);
} finally {
  fs.rmSync(tmpIndex, { force: true });
}
